import { Router } from "express";
import { ChallengeDomain, UserRole } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/authenticate";
import { requireRole, requireScope } from "../middleware/rbac";

export const authorityRouter = Router();

const STAFF_ROLES: UserRole[] = [
  UserRole.UNIVERSITY_ADMIN,
  UserRole.GOVERNMENT_ADMIN,
  UserRole.SUPER_ADMIN,
];

authorityRouter.use(authenticate);

function sanitizeDomains(input: unknown): ChallengeDomain[] {
  if (!Array.isArray(input)) return [];
  return input.filter((d): d is ChallengeDomain =>
    typeof d === "string" && Object.values(ChallengeDomain).includes(d as ChallengeDomain),
  );
}

// Directory of specific officials/staff a report can be assigned to.
// requireScope() gives us exactly the right filter here too — cityId for
// government-side authorities, universityId for university-side ones — same
// field names as Report, so no bespoke scoping logic needed for reads.
authorityRouter.get("/", requireRole(...STAFF_ROLES), requireScope(), async (req, res) => {
  const { domain, includeInactive } = req.query;

  const domainFilter =
    typeof domain === "string" && Object.values(ChallengeDomain).includes(domain as ChallengeDomain)
      ? (domain as ChallengeDomain)
      : undefined;

  const authorities = await prisma.authority.findMany({
    where: {
      ...req.scope,
      ...(domainFilter ? { domains: { has: domainFilter } } : {}),
      ...(includeInactive === "true" ? {} : { isActive: true }),
    },
    orderBy: { name: "asc" },
  });

  res.json({ authorities });
});

// A university admin can only ever create authorities under their own
// institution, a government admin only under their own district — the body
// can't override that. A super admin has to say which one explicitly.
authorityRouter.post("/", requireRole(...STAFF_ROLES), async (req, res) => {
  const { name, designation, department, phone, email, domains, cityId, universityId } =
    req.body ?? {};

  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "name is required" });
  }

  let scopedCityId: string | null = null;
  let scopedUniversityId: string | null = null;

  if (req.user!.role === UserRole.UNIVERSITY_ADMIN) {
    if (!req.user!.universityId) {
      return res.status(400).json({ error: "Your account has no university assigned" });
    }
    scopedUniversityId = req.user!.universityId;
  } else if (req.user!.role === UserRole.GOVERNMENT_ADMIN) {
    if (!req.user!.cityId) {
      return res.status(400).json({ error: "Your account has no district assigned" });
    }
    scopedCityId = req.user!.cityId;
  } else {
    // SUPER_ADMIN: exactly one of cityId/universityId must be provided.
    if ((!cityId && !universityId) || (cityId && universityId)) {
      return res.status(400).json({ error: "Provide exactly one of cityId or universityId" });
    }
    if (cityId) {
      const city = await prisma.city.findUnique({ where: { id: cityId } });
      if (!city) return res.status(400).json({ error: "cityId does not refer to an existing district" });
      scopedCityId = cityId;
    } else {
      const university = await prisma.university.findUnique({ where: { id: universityId } });
      if (!university) return res.status(400).json({ error: "universityId does not refer to an existing university" });
      scopedUniversityId = universityId;
    }
  }

  const authority = await prisma.authority.create({
    data: {
      name: name.trim(),
      designation: typeof designation === "string" ? designation.trim() || null : null,
      department: typeof department === "string" ? department.trim() || null : null,
      phone: typeof phone === "string" ? phone.trim() || null : null,
      email: typeof email === "string" ? email.trim() || null : null,
      domains: sanitizeDomains(domains),
      cityId: scopedCityId,
      universityId: scopedUniversityId,
    },
  });

  res.status(201).json({ authority });
});

authorityRouter.patch("/:id", requireRole(...STAFF_ROLES), requireScope(), async (req, res) => {
  const existing = await prisma.authority.findFirst({
    where: { id: String(req.params.id), ...req.scope },
  });

  if (!existing) {
    return res.status(404).json({ error: "Authority not found" });
  }

  const { name, designation, department, phone, email, domains, isActive } = req.body ?? {};

  const authority = await prisma.authority.update({
    where: { id: existing.id },
    data: {
      ...(typeof name === "string" && name.trim() ? { name: name.trim() } : {}),
      ...(designation !== undefined ? { designation: designation?.trim?.() || null } : {}),
      ...(department !== undefined ? { department: department?.trim?.() || null } : {}),
      ...(phone !== undefined ? { phone: phone?.trim?.() || null } : {}),
      ...(email !== undefined ? { email: email?.trim?.() || null } : {}),
      ...(domains !== undefined ? { domains: sanitizeDomains(domains) } : {}),
      ...(typeof isActive === "boolean" ? { isActive } : {}),
    },
  });

  res.json({ authority });
});
