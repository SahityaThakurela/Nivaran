import { Router } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { signAuthToken } from "../lib/jwt";
import type { User } from "@prisma/client";

export const authRouter = Router();

const SALT_ROUNDS = 10;

// Never send passwordHash back to the client.
function toSafeUser(user: User) {
  const { id, name, email, phone, role, cityId, departmentId } = user;
  return { id, name, email, phone, role, cityId, departmentId };
}

authRouter.post("/register", async (req, res) => {
  const { name, email, phone, password, role, cityId, departmentId } = req.body ?? {};

  if (!name || !password || (!email && !phone)) {
    return res.status(400).json({
      error: "name, password, and at least one of email/phone are required",
    });
  }

  const orFilters: Array<{ email: string } | { phone: string }> = [];
  if (email) orFilters.push({ email });
  if (phone) orFilters.push({ phone });

  const existing = await prisma.user.findFirst({ where: { OR: orFilters } });
  if (existing) {
    return res.status(409).json({ error: "A user with this email or phone already exists" });
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // NOTE: accepting role/cityId/departmentId here is a temporary hackathon
  // shortcut so every role can be tested via curl before RBAC exists. Once
  // requireRole()/requireScope() land, move non-CITIZEN account creation
  // behind a SUPER_ADMIN-only route instead of leaving it open here.
  const user = await prisma.user.create({
    data: {
      name,
      email: email ?? null,
      phone: phone ?? null,
      passwordHash,
      role: role ?? "CITIZEN",
      cityId: cityId ?? null,
      departmentId: departmentId ?? null,
    },
  });

  const token = signAuthToken({
    sub: user.id,
    role: user.role,
    cityId: user.cityId,
    departmentId: user.departmentId,
  });

  res.status(201).json({ token, user: toSafeUser(user) });
});

authRouter.post("/login", async (req, res) => {
  const { email, phone, password } = req.body ?? {};

  if ((!email && !phone) || !password) {
    return res.status(400).json({ error: "email or phone, and password are required" });
  }

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
    departmentId: user.departmentId,
  });

  res.json({ token, user: toSafeUser(user) });
});
