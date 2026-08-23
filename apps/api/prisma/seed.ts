/**
 * Seeds placeholder Jharkhand data: districts (City rows), universities with
 * domain specializations, and a handful of industry partners.
 *
 * Usage (from apps/api): pnpm prisma:seed
 *
 * Names below are representative, not an official/curated directory — swap
 * in real institutions whenever they're available.
 */
import "dotenv/config";
import { ChallengeDomain, PartnerType, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DISTRICTS = ["Ranchi", "Dhanbad", "East Singhbhum", "Bokaro", "Hazaribagh", "Deoghar"] as const;

/** Fixed id for the default/demo district so mobile .env / eas.json can reference it deterministically. */
const DISTRICT_FIXED_IDS: Partial<Record<(typeof DISTRICTS)[number], string>> = {
  Ranchi: "cmtcityranchi00000000001",
};

const UNIVERSITIES: Array<{
  name: string;
  district: (typeof DISTRICTS)[number];
  type: string;
  specializations: ChallengeDomain[];
}> = [
  {
    name: "Birla Institute of Technology, Mesra",
    district: "Ranchi",
    type: "DEEMED",
    specializations: [
      ChallengeDomain.URBAN_DEVELOPMENT,
      ChallengeDomain.ENERGY,
      ChallengeDomain.ENVIRONMENT,
    ],
  },
  {
    name: "Central University of Jharkhand",
    district: "Ranchi",
    type: "CENTRAL",
    specializations: [
      ChallengeDomain.EDUCATION,
      ChallengeDomain.PUBLIC_ADMINISTRATION,
      ChallengeDomain.RURAL_LIVELIHOODS,
    ],
  },
  {
    name: "Rajendra Institute of Medical Sciences (RIMS), Ranchi",
    district: "Ranchi",
    type: "STATE",
    specializations: [ChallengeDomain.HEALTHCARE],
  },
  {
    name: "National Institute of Technology, Jamshedpur",
    district: "East Singhbhum",
    type: "CENTRAL",
    specializations: [
      ChallengeDomain.URBAN_DEVELOPMENT,
      ChallengeDomain.ENERGY,
      ChallengeDomain.ACCESSIBILITY,
    ],
  },
  {
    name: "Indian Institute of Health Management, Jamshedpur",
    district: "East Singhbhum",
    type: "PRIVATE",
    specializations: [ChallengeDomain.HEALTHCARE, ChallengeDomain.RURAL_LIVELIHOODS],
  },
  {
    name: "Indian School of Mines / IIT (ISM), Dhanbad",
    district: "Dhanbad",
    type: "CENTRAL",
    specializations: [
      ChallengeDomain.ENVIRONMENT,
      ChallengeDomain.WATER_RESOURCES,
      ChallengeDomain.ENERGY,
    ],
  },
  {
    name: "Vinoba Bhave University, Hazaribagh",
    district: "Hazaribagh",
    type: "STATE",
    specializations: [
      ChallengeDomain.AGRICULTURE,
      ChallengeDomain.RURAL_LIVELIHOODS,
      ChallengeDomain.EDUCATION,
    ],
  },
  {
    name: "ICAR Research Complex for Eastern Region (Jharkhand campus)",
    district: "Ranchi",
    type: "RESEARCH",
    specializations: [ChallengeDomain.AGRICULTURE, ChallengeDomain.WATER_RESOURCES],
  },
];

const INDUSTRY_PARTNERS: Array<{
  name: string;
  type: PartnerType;
  domains: ChallengeDomain[];
  contactEmail: string;
}> = [
  {
    name: "AgriNext Solutions (Startup)",
    type: PartnerType.STARTUP,
    domains: [ChallengeDomain.AGRICULTURE, ChallengeDomain.RURAL_LIVELIHOODS],
    contactEmail: "partnerships@agrinext.example",
  },
  {
    name: "Jharkhand MedTech MSME Cluster",
    type: PartnerType.MSME,
    domains: [ChallengeDomain.HEALTHCARE],
    contactEmail: "info@jhmedtech.example",
  },
  {
    name: "Tata Steel CSR Foundation",
    type: PartnerType.CSR,
    domains: [ChallengeDomain.URBAN_DEVELOPMENT, ChallengeDomain.ENVIRONMENT, ChallengeDomain.EDUCATION],
    contactEmail: "csr@tatasteel.example",
  },
  {
    name: "CSIR-CIMFR Innovation Lab",
    type: PartnerType.RESEARCH_LAB,
    domains: [ChallengeDomain.ENVIRONMENT, ChallengeDomain.ENERGY, ChallengeDomain.WATER_RESOURCES],
    contactEmail: "innovation@cimfr.example",
  },
  {
    name: "Ranchi Renewable Energy Corp",
    type: PartnerType.CORPORATE,
    domains: [ChallengeDomain.ENERGY, ChallengeDomain.URBAN_DEVELOPMENT],
    contactEmail: "contact@ranchirenewable.example",
  },
];

async function main() {
  console.log("Seeding Jharkhand districts, universities, and industry partners...\n");

  const cityByDistrict = new Map<string, string>();
  for (const district of DISTRICTS) {
    const fixedId = DISTRICT_FIXED_IDS[district];
    const city = await prisma.city.upsert({
      where: { name_state: { name: district, state: "Jharkhand" } },
      update: {},
      create: fixedId
        ? { id: fixedId, name: district, state: "Jharkhand" }
        : { name: district, state: "Jharkhand" },
    });
    cityByDistrict.set(district, city.id);
    console.log(`  district: ${district} (${city.id})`);
  }

  for (const uni of UNIVERSITIES) {
    const cityId = cityByDistrict.get(uni.district);
    if (!cityId) continue;

    const existing = await prisma.university.findFirst({ where: { name: uni.name } });
    if (existing) {
      console.log(`  university (exists): ${uni.name}`);
      continue;
    }

    await prisma.university.create({
      data: {
        name: uni.name,
        type: uni.type,
        cityId,
        specializations: uni.specializations,
      },
    });
    console.log(`  university: ${uni.name} [${uni.specializations.join(", ")}]`);
  }

  for (const partner of INDUSTRY_PARTNERS) {
    const existing = await prisma.industryPartner.findFirst({ where: { name: partner.name } });
    if (existing) {
      console.log(`  industry partner (exists): ${partner.name}`);
      continue;
    }

    await prisma.industryPartner.create({
      data: {
        name: partner.name,
        type: partner.type,
        domains: partner.domains,
        contactEmail: partner.contactEmail,
      },
    });
    console.log(`  industry partner: ${partner.name} [${partner.type}]`);
  }

  console.log("\nSeed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
