import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/authenticate";

export const cityRouter = Router();

cityRouter.use(authenticate);

// Read-only district directory — seeded (see prisma/seed.ts), not managed
// through the UI. Used by the admin dashboard's district pickers (e.g.
// creating a government admin account or a government-side authority).
cityRouter.get("/", async (_req, res) => {
  const cities = await prisma.city.findMany({ orderBy: { name: "asc" } });
  res.json({ cities });
});
