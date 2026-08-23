import { Router } from "express";
import { ChallengeDomain } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/authenticate";

export const universityRouter = Router();

universityRouter.use(authenticate);

// Read-only directory for this pass — universities/specializations are
// seeded (see prisma/seed.ts), not managed through the UI yet. Used by the
// admin dashboard's "Universities" tab and (optionally) by clients that want
// to show which institution a challenge was routed to.
universityRouter.get("/", async (req, res) => {
  const { domain, cityId } = req.query;

  const domainFilter =
    typeof domain === "string" && Object.values(ChallengeDomain).includes(domain as ChallengeDomain)
      ? (domain as ChallengeDomain)
      : undefined;
  const cityFilter = typeof cityId === "string" ? cityId : undefined;

  const universities = await prisma.university.findMany({
    where: {
      ...(domainFilter ? { specializations: { has: domainFilter } } : {}),
      ...(cityFilter ? { cityId: cityFilter } : {}),
    },
    include: { city: true },
    orderBy: { name: "asc" },
  });

  res.json({ universities });
});

universityRouter.get("/:id", async (req, res) => {
  const university = await prisma.university.findUnique({
    where: { id: String(req.params.id) },
    include: { city: true },
  });

  if (!university) {
    return res.status(404).json({ error: "University not found" });
  }

  res.json({ university });
});
