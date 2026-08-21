/**
 * Smoke-tests every API route against a running server.
 * Usage (from apps/api): pnpm test:routes
 *
 * Expects the API at BASE_URL (default http://localhost:4000) and a working DB.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:4000";

// Prefer DIRECT_URL for this script's own Prisma client. Supabase's pooled
// DATABASE_URL (PgBouncer transaction mode) breaks Prisma prepared statements
// ("prepared statement s0 already exists") when the API and this script both
// open clients against the pooler.
const prismaUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const prisma = new PrismaClient(
  prismaUrl ? { datasources: { db: { url: prismaUrl } } } : undefined,
);

type Json = Record<string, unknown> | null;

interface StepResult {
  name: string;
  ok: boolean;
  status: number;
  detail: string;
}

const results: StepResult[] = [];
const suffix = Date.now().toString(36);

function pass(name: string, status: number, detail: string) {
  results.push({ name, ok: true, status, detail });
  console.log(`  PASS  [${status}] ${name} — ${detail}`);
}

function fail(name: string, status: number, detail: string) {
  results.push({ name, ok: false, status, detail });
  console.log(`  FAIL  [${status}] ${name} — ${detail}`);
}

async function request(
  method: string,
  path: string,
  opts: { token?: string; body?: unknown; expect?: number | number[] } = {},
): Promise<{ status: number; json: Json; text: string }> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  const text = await res.text();
  let json: Json = null;
  try {
    json = text ? (JSON.parse(text) as Json) : null;
  } catch {
    json = null;
  }

  const expected = opts.expect;
  if (expected !== undefined) {
    const allowed = Array.isArray(expected) ? expected : [expected];
    if (!allowed.includes(res.status)) {
      throw new Error(
        `expected ${allowed.join("|")}, got ${res.status}: ${text.slice(0, 300)}`,
      );
    }
  }

  return { status: res.status, json, text };
}

async function checkDatabase(): Promise<boolean> {
  console.log("\n== Database ==");
  try {
    await prisma.$queryRaw`SELECT 1`;
    const [{ cities }] = await prisma.$queryRaw<{ cities: bigint }[]>`
      SELECT COUNT(*)::bigint AS cities FROM "City"
    `;
    pass("prisma.$queryRaw", 200, `connected (cities=${cities})`);
    return true;
  } catch (error) {
    const raw = error instanceof Error ? error.message : String(error);
    const message =
      raw
        .split("\n")
        .map((line) => line.trim())
        .find((line) => line && !line.startsWith("Invalid `")) ?? raw.slice(0, 240);
    fail("prisma.$queryRaw", 0, message);
    return false;
  }
}

async function ensureCity(): Promise<string> {
  const existing = await prisma.city.findFirst();
  if (existing) return existing.id;

  const city = await prisma.city.create({
    data: { name: `Test City ${suffix}`, state: "MH" },
  });
  console.log(`  seeded city ${city.id}`);
  return city.id;
}

async function run() {
  console.log(`\nAPI smoke test → ${BASE_URL}`);

  // --- Health (Express process + DB) ---
  console.log("\n== Health ==");
  try {
    const health = await request("GET", "/health");
    if (health.status === 200 && health.json && (health.json as { db?: string }).db === "connected") {
      pass("GET /health", health.status, JSON.stringify(health.json));
    } else {
      fail("GET /health", health.status, health.text.slice(0, 300));
    }
  } catch (error) {
    fail("GET /health", 0, error instanceof Error ? error.message : String(error));
    console.log("\nAPI is not reachable. Start it with: pnpm dev");
    process.exitCode = 1;
    return;
  }

  const dbOk = await checkDatabase();
  if (!dbOk) {
    console.log(`
Direct Prisma check failed. Common causes with Supabase:
  1. Pooled DATABASE_URL missing ?pgbouncer=true  (prepared statement errors)
  2. Wrong password / URI in apps/api/.env
  3. DIRECT_URL not set (this script prefers it for its own Prisma client)

Fix: Supabase → Project Settings → Database → Connect → copy pooler + direct
URIs, ensure DATABASE_URL ends with ?pgbouncer=true, restart pnpm dev, re-run.
`);
    process.exitCode = 1;
    return;
  }

  const cityId = await ensureCity();

  // --- Auth ---
  console.log("\n== Auth ==");
  const citizenEmail = `citizen_${suffix}@test.local`;
  const workerEmail = `worker_${suffix}@test.local`;
  const adminEmail = `admin_${suffix}@test.local`;
  const password = "TestPass123!";

  let citizenToken = "";
  let workerToken = "";
  let adminToken = "";
  let citizenId = "";
  let workerId = "";

  try {
    const reg = await request("POST", "/api/auth/register", {
      body: { name: "Citizen", email: citizenEmail, password, role: "CITIZEN" },
      expect: 201,
    });
    citizenToken = String((reg.json as { token: string }).token);
    citizenId = String((reg.json as { user: { id: string } }).user.id);
    pass("POST /api/auth/register (citizen)", reg.status, `user=${citizenId}`);
  } catch (error) {
    fail("POST /api/auth/register (citizen)", 0, error instanceof Error ? error.message : String(error));
  }

  try {
    const login = await request("POST", "/api/auth/login", {
      body: { email: citizenEmail, password },
      expect: 200,
    });
    citizenToken = String((login.json as { token: string }).token);
    pass("POST /api/auth/login", login.status, "token issued");
  } catch (error) {
    fail("POST /api/auth/login", 0, error instanceof Error ? error.message : String(error));
  }

  try {
    const bad = await request("POST", "/api/auth/login", {
      body: { email: citizenEmail, password: "wrong" },
      expect: 401,
    });
    pass("POST /api/auth/login (bad password)", bad.status, "rejected as expected");
  } catch (error) {
    fail("POST /api/auth/login (bad password)", 0, error instanceof Error ? error.message : String(error));
  }

  try {
    const worker = await request("POST", "/api/auth/register", {
      body: {
        name: "Worker",
        email: workerEmail,
        password,
        role: "FIELD_WORKER",
        cityId,
      },
      expect: 201,
    });
    workerToken = String((worker.json as { token: string }).token);
    workerId = String((worker.json as { user: { id: string } }).user.id);
    pass("POST /api/auth/register (field worker)", worker.status, `user=${workerId}`);
  } catch (error) {
    fail("POST /api/auth/register (field worker)", 0, error instanceof Error ? error.message : String(error));
  }

  try {
    const admin = await request("POST", "/api/auth/register", {
      body: {
        name: "Admin",
        email: adminEmail,
        password,
        role: "SUPER_ADMIN",
      },
      expect: 201,
    });
    adminToken = String((admin.json as { token: string }).token);
    pass("POST /api/auth/register (super admin)", admin.status, "token issued");
  } catch (error) {
    fail("POST /api/auth/register (super admin)", 0, error instanceof Error ? error.message : String(error));
  }

  // --- Issues ---
  console.log("\n== Issues ==");
  let reportId = "";

  try {
    const unauth = await request("POST", "/api/issues", {
      body: { description: "x", cityId, latitude: 18.5, longitude: 73.8 },
      expect: 401,
    });
    pass("POST /api/issues (no auth)", unauth.status, "401 as expected");
  } catch (error) {
    fail("POST /api/issues (no auth)", 0, error instanceof Error ? error.message : String(error));
  }

  try {
    const created = await request("POST", "/api/issues", {
      token: citizenToken,
      body: {
        description: `Pothole on main road near test ${suffix}`,
        cityId,
        latitude: 18.5204,
        longitude: 73.8567,
        address: "FC Road, Pune",
        photoUrls: ["https://example.com/pothole.jpg"],
      },
      expect: 201,
    });
    reportId = String((created.json as { report: { id: string } }).report.id);
    pass("POST /api/issues", created.status, `report=${reportId}`);
  } catch (error) {
    fail("POST /api/issues", 0, error instanceof Error ? error.message : String(error));
  }

  try {
    const list = await request("GET", "/api/issues", { token: citizenToken, expect: 200 });
    const count = Array.isArray((list.json as { reports?: unknown[] }).reports)
      ? (list.json as { reports: unknown[] }).reports.length
      : 0;
    pass("GET /api/issues", list.status, `${count} report(s)`);
  } catch (error) {
    fail("GET /api/issues", 0, error instanceof Error ? error.message : String(error));
  }

  if (reportId) {
    try {
      const one = await request("GET", `/api/issues/${reportId}`, {
        token: citizenToken,
        expect: 200,
      });
      pass("GET /api/issues/:id", one.status, "found");
    } catch (error) {
      fail("GET /api/issues/:id", 0, error instanceof Error ? error.message : String(error));
    }

    try {
      const dups = await request("GET", `/api/issues/${reportId}/duplicates`, {
        token: adminToken,
        expect: 200,
      });
      const n = Array.isArray((dups.json as { candidates?: unknown[] }).candidates)
        ? (dups.json as { candidates: unknown[] }).candidates.length
        : 0;
      pass("GET /api/issues/:id/duplicates", dups.status, `${n} candidate(s)`);
    } catch (error) {
      fail("GET /api/issues/:id/duplicates", 0, error instanceof Error ? error.message : String(error));
    }

    try {
      const citizenBlocked = await request("GET", `/api/issues/${reportId}/duplicates`, {
        token: citizenToken,
        expect: 403,
      });
      pass("GET /api/issues/:id/duplicates (citizen)", citizenBlocked.status, "403 as expected");
    } catch (error) {
      fail(
        "GET /api/issues/:id/duplicates (citizen)",
        0,
        error instanceof Error ? error.message : String(error),
      );
    }

    try {
      const patched = await request("PATCH", `/api/issues/${reportId}`, {
        token: adminToken,
        body: {
          status: "ASSIGNED",
          assignedToId: workerId,
          note: "Assigned for smoke test",
        },
        expect: 200,
      });
      const status = (patched.json as { report: { status: string } }).report.status;
      pass("PATCH /api/issues/:id", patched.status, `status=${status}`);
    } catch (error) {
      fail("PATCH /api/issues/:id", 0, error instanceof Error ? error.message : String(error));
    }
  }

  // --- Tasks ---
  console.log("\n== Tasks ==");
  if (reportId && workerToken) {
    try {
      const accept = await request("POST", `/api/tasks/${reportId}/accept`, {
        token: workerToken,
        expect: 200,
      });
      pass(
        "POST /api/tasks/:id/accept",
        accept.status,
        `status=${(accept.json as { report: { status: string } }).report.status}`,
      );
    } catch (error) {
      fail("POST /api/tasks/:id/accept", 0, error instanceof Error ? error.message : String(error));
    }

    try {
      const complete = await request("POST", `/api/tasks/${reportId}/complete`, {
        token: workerToken,
        body: {
          resolutionEvidenceUrls: ["https://example.com/fixed.jpg"],
          note: "Filled and sealed",
        },
        expect: 200,
      });
      pass(
        "POST /api/tasks/:id/complete",
        complete.status,
        `status=${(complete.json as { report: { status: string } }).report.status}`,
      );
    } catch (error) {
      fail("POST /api/tasks/:id/complete", 0, error instanceof Error ? error.message : String(error));
    }
  } else {
    fail("POST /api/tasks/*", 0, "skipped — missing reportId or workerToken");
  }

  // --- AI ---
  console.log("\n== AI ==");
  // Create a fresh report so classification has something SUBMITTED to analyze
  let aiReportId = "";
  try {
    const created = await request("POST", "/api/issues", {
      token: citizenToken,
      body: {
        description: `Broken streetlight near park ${suffix}`,
        cityId,
        latitude: 18.53,
        longitude: 73.85,
      },
      expect: 201,
    });
    aiReportId = String((created.json as { report: { id: string } }).report.id);
  } catch {
    // already recorded above if create is broken
  }

  if (aiReportId) {
    try {
      const analyzed = await request("POST", "/api/ai/analyze-report", {
        token: citizenToken,
        body: { reportId: aiReportId },
        expect: 200,
      });
      const report = (analyzed.json as { report: { category?: string; severity?: string } }).report;
      pass(
        "POST /api/ai/analyze-report",
        analyzed.status,
        `category=${report.category ?? "null"} severity=${report.severity ?? "null"}`,
      );
    } catch (error) {
      fail("POST /api/ai/analyze-report", 0, error instanceof Error ? error.message : String(error));
    }
  } else {
    fail("POST /api/ai/analyze-report", 0, "skipped — could not create report");
  }

  // --- Analytics ---
  console.log("\n== Analytics ==");
  try {
    const overview = await request("GET", "/api/analytics/overview", {
      token: adminToken,
      expect: 200,
    });
    const total = (overview.json as { totalReports?: number }).totalReports;
    pass("GET /api/analytics/overview", overview.status, `totalReports=${total}`);
  } catch (error) {
    fail("GET /api/analytics/overview", 0, error instanceof Error ? error.message : String(error));
  }

  try {
    const blocked = await request("GET", "/api/analytics/overview", {
      token: citizenToken,
      expect: 403,
    });
    pass("GET /api/analytics/overview (citizen)", blocked.status, "403 as expected");
  } catch (error) {
    fail(
      "GET /api/analytics/overview (citizen)",
      0,
      error instanceof Error ? error.message : String(error),
    );
  }

  // --- Summary ---
  const failed = results.filter((r) => !r.ok);
  const passed = results.filter((r) => r.ok);
  console.log(`\n== Summary ==`);
  console.log(`Passed: ${passed.length}`);
  console.log(`Failed: ${failed.length}`);
  if (failed.length) {
    console.log("Failed steps:");
    for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);
    process.exitCode = 1;
  } else {
    console.log("All route checks passed.");
  }
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
