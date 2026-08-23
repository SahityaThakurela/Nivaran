import { Router } from "express";
import { ChallengeDomain } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/authenticate";

export const industryPartnerRouter = Router();

industryPartnerRouter.use(authenticate);

// Read-only directory for this pass — a simple picker for university admins
// to loop a partner in on a challenge (Report.industryPartnerId). No
// application/matching workflow yet.
industryPartnerRouter.get("/", async (req, res) => {
  const { domain } = req.query;

  const domainFilter =
    typeof domain === "string" && Object.values(ChallengeDomain).includes(domain as ChallengeDomain)
      ? (domain as ChallengeDomain)
      : undefined;

  const partners = await prisma.industryPartner.findMany({
    where: domainFilter ? { domains: { has: domainFilter } } : {},
    orderBy: { name: "asc" },
  });

  res.json({ partners });
});
