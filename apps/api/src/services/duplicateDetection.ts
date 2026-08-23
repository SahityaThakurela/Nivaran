import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

// Statuses that still represent an open problem — a report that's already
// RESOLVED/REJECTED/DUPLICATE isn't a useful duplicate target.
const OPEN_STATUSES = ["SUBMITTED", "ACKNOWLEDGED", "ASSIGNED", "IN_PROGRESS"];

const DEFAULT_RADIUS_METERS = 100;
const DEFAULT_LIMIT = 5;

// Plain weighted arithmetic — same philosophy as priorityScore. No AI here,
// just combining two measured distances into one comparable number.
const GEO_WEIGHT = 0.4;
const SEMANTIC_WEIGHT = 0.6;

export interface DuplicateCandidate {
  id: string;
  description: string;
  status: string;
  domain: string | null;
  distanceMeters: number;
  semanticSimilarity: number | null;
  likelihoodScore: number;
}

interface RawCandidateRow {
  id: string;
  description: string;
  status: string;
  domain: string | null;
  distance_meters: number;
  cosine_distance: number | null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// Stage 1 (geo filter) + Stage 2 (semantic similarity), combined in one
// query: ST_DWithin narrows to nearby *open* reports in the same city, then
// pgvector's `<=>` cosine-distance operator ranks them by how similar their
// descriptions are. If either report has no embedding yet, semantic
// similarity is left null and the score falls back to geo distance alone —
// it never silently drops a candidate just because embedding generation
// hasn't run yet.
//
// This never merges anything — it just returns scored candidates for a
// human (staff) to review and act on via PATCH /api/issues/:id.
export async function findDuplicateCandidates(
  reportId: string,
  options: { radiusMeters?: number; limit?: number } = {},
): Promise<DuplicateCandidate[]> {
  const radiusMeters = options.radiusMeters ?? DEFAULT_RADIUS_METERS;
  const limit = options.limit ?? DEFAULT_LIMIT;

  const target = await prisma.report.findUniqueOrThrow({
    where: { id: reportId },
    select: { cityId: true },
  });

  const rows = await prisma.$queryRaw<RawCandidateRow[]>`
    SELECT
      r.id,
      r.description,
      r.status,
      r.domain,
      ST_Distance(r.location, target.location) AS distance_meters,
      CASE WHEN r.embedding IS NOT NULL AND target.embedding IS NOT NULL
        THEN (r.embedding <=> target.embedding)
        ELSE NULL
      END AS cosine_distance
    FROM "Report" r, (SELECT location, embedding FROM "Report" WHERE id = ${reportId}) AS target
    WHERE r.id != ${reportId}
      AND r."cityId" = ${target.cityId}
      AND r.status::text IN (${Prisma.join(OPEN_STATUSES)})
      AND target.location IS NOT NULL
      AND r.location IS NOT NULL
      AND ST_DWithin(r.location, target.location, ${radiusMeters})
    ORDER BY distance_meters ASC
    LIMIT ${limit}
  `;

  return rows
    .map((row) => {
      const geoScore = clamp(1 - row.distance_meters / radiusMeters, 0, 1);
      const semanticScore = row.cosine_distance === null ? null : clamp(1 - row.cosine_distance, 0, 1);

      const likelihoodScore =
        semanticScore === null ? geoScore : GEO_WEIGHT * geoScore + SEMANTIC_WEIGHT * semanticScore;

      return {
        id: row.id,
        description: row.description,
        status: row.status,
        domain: row.domain,
        distanceMeters: Math.round(row.distance_meters),
        semanticSimilarity: semanticScore === null ? null : Number(semanticScore.toFixed(3)),
        likelihoodScore: Number(likelihoodScore.toFixed(3)),
      };
    })
    .sort((a, b) => b.likelihoodScore - a.likelihoodScore);
}
