import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { signAuthToken } from "../lib/jwt";
import { UserRole, type User } from "@prisma/client";
import { authenticate } from "../middleware/authenticate";
import { requireRole, requireScope } from "../middleware/rbac";

export const authRouter = Router();

const SALT_ROUNDS = 10;

const STAFF_ROLES: UserRole[] = [
  UserRole.UNIVERSITY_ADMIN,
  UserRole.GOVERNMENT_ADMIN,
  UserRole.SUPER_ADMIN,
];

// Who can create new staff accounts: super admin can create any staff role,
// a government admin can only bring on other government admins in their own
// district. University admins don't get an invite flow in this pass —
// university staff onboarding stays a super-admin action.
const STAFF_MANAGER_ROLES: UserRole[] = [UserRole.GOVERNMENT_ADMIN, UserRole.SUPER_ADMIN];

// Never send passwordHash back to the client.
function toSafeUser(user: User) {
  const { id, name, email, phone, role, cityId, universityId } = user;
  return { id, name, email, phone, role, cityId, universityId };
}

authRouter.post("/register", async (req, res) => {
  const { name, email, phone, password, role, cityId, universityId } = req.body ?? {};

  if (!name || !password || (!email && !phone)) {
    return res.status(400).json({
      error: "name, password, and at least one of email/phone are required",
    });
  }

  const orFilters: Array<{ email: string } | { phone: string }> = [];
  if (email) orFilters.push({ email });
  if (phone) orFilters.push({ phone });

  try {
    const existing = await prisma.user.findFirst({ where: { OR: orFilters } });
    if (existing) {
      return res.status(409).json({ error: "A user with this email or phone already exists" });
    }

    // Validate cityId exists before inserting to give a clear error instead of a FK 500.
    if (cityId) {
      const city = await prisma.city.findUnique({ where: { id: cityId } });
      if (!city) {
        return res.status(400).json({ error: "Invalid cityId — city not found. Please update the app." });
      }
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        name,
        email: email ?? null,
        phone: phone ?? null,
        passwordHash,
        role: role ?? "CITIZEN",
        cityId: cityId ?? null,
        universityId: universityId ?? null,
      },
    });

    const token = signAuthToken({
      sub: user.id,
      role: user.role,
      cityId: user.cityId,
      universityId: user.universityId,
    });

    res.status(201).json({ token, user: toSafeUser(user) });
  } catch (err: unknown) {
    // Prisma foreign-key constraint violation (e.g. cityId doesn't exist in DB)
    const code = (err as { code?: string })?.code;
    if (code === "P2003") {
      return res.status(400).json({ error: "Invalid cityId or universityId — referenced record not found." });
    }
    // Unique constraint (race condition — two registrations at the same time)
    if (code === "P2002") {
      return res.status(409).json({ error: "A user with this email or phone already exists" });
    }
    console.error("Register error:", err);
    return res.status(500).json({ error: "Registration failed. Please try again." });
  }
});

authRouter.post("/login", async (req, res) => {
  const { email, phone, password } = req.body ?? {};

  if ((!email && !phone) || !password) {
    return res.status(400).json({ error: "email or phone, and password are required" });
  }

  try {
    const user = await prisma.user.findFirst({
      where: email ? { email } : { phone },
    });

    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = signAuthToken({
      sub: user.id,
      role: user.role,
      cityId: user.cityId,
      universityId: user.universityId,
    });

    res.json({ token, user: toSafeUser(user) });
  } catch (err: unknown) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Login failed. Please try again." });
  }
});


// Staff directory for the dashboard's Admin Management page. requireScope()
// keeps this consistent with every other route: a government admin only
// ever sees accounts in their own district, a university admin only their
// own institution's.
authRouter.get("/users", authenticate, requireRole(...STAFF_ROLES), requireScope(), async (req, res) => {
  const users = await prisma.user.findMany({
    where: req.scope,
    orderBy: { createdAt: "desc" },
  });

  res.json({ users: users.map(toSafeUser) });
});

// Real "Invite Staff" endpoint (replaces the dashboard's placeholder that
// pointed at curl-ing /register directly). Scope is enforced server-side,
// not trusted from the request body — a government admin can't grant
// themselves SUPER_ADMIN or plant an account in another district.
authRouter.post("/staff", authenticate, requireRole(...STAFF_MANAGER_ROLES), async (req, res) => {
  const { name, email, phone, password, role, cityId, universityId } = req.body ?? {};

  if (!name || !password || (!email && !phone)) {
    return res.status(400).json({
      error: "name, password, and at least one of email/phone are required",
    });
  }
  if (!role || !STAFF_ROLES.includes(role)) {
    return res.status(400).json({ error: "role must be one of UNIVERSITY_ADMIN, GOVERNMENT_ADMIN, SUPER_ADMIN" });
  }

  let finalCityId: string | null = null;
  let finalUniversityId: string | null = null;

  if (req.user!.role === UserRole.GOVERNMENT_ADMIN) {
    if (role !== UserRole.GOVERNMENT_ADMIN) {
      return res.status(403).json({ error: "Government admins can only create other government admin accounts" });
    }
    finalCityId = req.user!.cityId ?? null;
  } else {
    // SUPER_ADMIN
    if (role === UserRole.UNIVERSITY_ADMIN) {
      if (!universityId) {
        return res.status(400).json({ error: "universityId is required for a university admin account" });
      }
      const university = await prisma.university.findUnique({ where: { id: universityId } });
      if (!university) {
        return res.status(400).json({ error: "universityId does not refer to an existing university" });
      }
      finalUniversityId = universityId;
    } else if (role === UserRole.GOVERNMENT_ADMIN) {
      if (!cityId) {
        return res.status(400).json({ error: "cityId is required for a government admin account" });
      }
      const city = await prisma.city.findUnique({ where: { id: cityId } });
      if (!city) {
        return res.status(400).json({ error: "cityId does not refer to an existing district" });
      }
      finalCityId = cityId;
    }
  }

  const orFilters: Array<{ email: string } | { phone: string }> = [];
  if (email) orFilters.push({ email });
  if (phone) orFilters.push({ phone });

  const existing = await prisma.user.findFirst({ where: { OR: orFilters } });
  if (existing) {
    return res.status(409).json({ error: "A user with this email or phone already exists" });
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      name,
      email: email ?? null,
      phone: phone ?? null,
      passwordHash,
      role,
      cityId: finalCityId,
      universityId: finalUniversityId,
    },
  });

  res.status(201).json({ user: toSafeUser(user) });
});
