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

/**
 * NOTE ON PII: names/phones/emails below are placeholders for demo/seed
 * purposes only (matching the existing university/partner seed data style),
 * not real individuals.
 */

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

// Government-side authorities, scoped to a district (City). These are who a
// GOVERNMENT_ADMIN assigns a challenge to when it doesn't need a university.
const GOVERNMENT_AUTHORITIES: Array<{
  name: string;
  designation: string;
  department: string;
  district: (typeof DISTRICTS)[number];
  domains: ChallengeDomain[];
  phone: string;
  email: string;
}> = [
  {
    name: "Er. Ramesh Oraon",
    designation: "Junior Engineer",
    department: "Public Works Department (PWD)",
    district: "Ranchi",
    domains: [ChallengeDomain.URBAN_DEVELOPMENT, ChallengeDomain.ACCESSIBILITY],
    phone: "+91 90000 10001",
    email: "r.oraon.pwd@jharkhand.gov.in",
  },
  {
    name: "Sunita Kumari",
    designation: "Sanitation Officer",
    department: "Ranchi Municipal Corporation",
    district: "Ranchi",
    domains: [ChallengeDomain.ENVIRONMENT, ChallengeDomain.URBAN_DEVELOPMENT],
    phone: "+91 90000 10002",
    email: "s.kumari.rmc@jharkhand.gov.in",
  },
  {
    name: "Dr. Ajay Singh",
    designation: "District Health Officer",
    department: "Dept. of Health, Medical Education & Family Welfare",
    district: "Ranchi",
    domains: [ChallengeDomain.HEALTHCARE],
    phone: "+91 90000 10003",
    email: "a.singh.health@jharkhand.gov.in",
  },
  {
    name: "Md. Irfan Ansari",
    designation: "Assistant Engineer",
    department: "Jharkhand Bijli Vitran Nigam (Electricity Board)",
    district: "Dhanbad",
    domains: [ChallengeDomain.ENERGY],
    phone: "+91 90000 10004",
    email: "i.ansari.jbvnl@jharkhand.gov.in",
  },
  {
    name: "Neha Tirkey",
    designation: "Block Development Officer",
    department: "Dept. of Rural Development",
    district: "Dhanbad",
    domains: [ChallengeDomain.RURAL_LIVELIHOODS, ChallengeDomain.AGRICULTURE],
    phone: "+91 90000 10005",
    email: "n.tirkey.rural@jharkhand.gov.in",
  },
  {
    name: "Vikram Mahato",
    designation: "Junior Engineer",
    department: "Public Health Engineering Dept. (Water Resources)",
    district: "East Singhbhum",
    domains: [ChallengeDomain.WATER_RESOURCES],
    phone: "+91 90000 10006",
    email: "v.mahato.phed@jharkhand.gov.in",
  },
  {
    name: "Pooja Devi",
    designation: "Municipal Sanitation Inspector",
    department: "Jamshedpur Notified Area Committee",
    district: "East Singhbhum",
    domains: [ChallengeDomain.ENVIRONMENT, ChallengeDomain.URBAN_DEVELOPMENT],
    phone: "+91 90000 10007",
    email: "p.devi.jnac@jharkhand.gov.in",
  },
  {
    name: "Sanjay Mahto",
    designation: "Circle Officer",
    department: "Dept. of Public Administration",
    district: "Bokaro",
    domains: [ChallengeDomain.PUBLIC_ADMINISTRATION],
    phone: "+91 90000 10008",
    email: "s.mahto.admin@jharkhand.gov.in",
  },
  {
    name: "Rekha Kumari",
    designation: "Assistant Education Officer",
    department: "Dept. of School Education & Literacy",
    district: "Hazaribagh",
    domains: [ChallengeDomain.EDUCATION, ChallengeDomain.ACCESSIBILITY],
    phone: "+91 90000 10009",
    email: "r.kumari.education@jharkhand.gov.in",
  },
  {
    name: "Bipin Besra",
    designation: "Junior Engineer",
    department: "Public Works Department (PWD)",
    district: "Deoghar",
    domains: [ChallengeDomain.URBAN_DEVELOPMENT, ChallengeDomain.WATER_RESOURCES],
    phone: "+91 90000 10010",
    email: "b.besra.pwd@jharkhand.gov.in",
  },
];

// University-side authorities — the nodal faculty/staff coordinator for a
// domain at that institution. A university admin assigns challenges to one
// of these instead of the free-text facultyMentor field going forward.
const UNIVERSITY_AUTHORITIES: Array<{
  name: string;
  designation: string;
  department: string;
  university: string;
  domains: ChallengeDomain[];
  phone: string;
  email: string;
}> = [
  {
    name: "Dr. Anita Kumar",
    designation: "Associate Professor & Nodal Coordinator",
    department: "Dept. of Civil Engineering",
    university: "Birla Institute of Technology, Mesra",
    domains: [ChallengeDomain.URBAN_DEVELOPMENT, ChallengeDomain.ENVIRONMENT],
    phone: "+91 90000 20001",
    email: "a.kumar@bitmesra.example",
  },
  {
    name: "Prof. Suresh Kumar",
    designation: "Professor, Dept. of Agriculture",
    department: "School of Rural Development",
    university: "Central University of Jharkhand",
    domains: [ChallengeDomain.RURAL_LIVELIHOODS, ChallengeDomain.EDUCATION],
    phone: "+91 90000 20002",
    email: "s.kumar@cuj.example",
  },
  {
    name: "Dr. Meera Prasad",
    designation: "Associate Dean, Community Medicine",
    department: "Dept. of Community Medicine",
    university: "Rajendra Institute of Medical Sciences (RIMS), Ranchi",
    domains: [ChallengeDomain.HEALTHCARE],
    phone: "+91 90000 20003",
    email: "m.prasad@rims.example",
  },
  {
    name: "Dr. Arvind Sinha",
    designation: "Professor, Dept. of Electrical Engineering",
    department: "Dept. of Electrical Engineering",
    university: "National Institute of Technology, Jamshedpur",
    domains: [ChallengeDomain.ENERGY, ChallengeDomain.ACCESSIBILITY],
    phone: "+91 90000 20004",
    email: "a.sinha@nitjsr.example",
  },
  {
    name: "Dr. Kavita Rao",
    designation: "Nodal Officer, Public Health Outreach",
    department: "Dept. of Public Health",
    university: "Indian Institute of Health Management, Jamshedpur",
    domains: [ChallengeDomain.HEALTHCARE, ChallengeDomain.RURAL_LIVELIHOODS],
    phone: "+91 90000 20005",
    email: "k.rao@iihmj.example",
  },
  {
    name: "Prof. Deepak Verma",
    designation: "Professor, Dept. of Environmental Science & Engineering",
    department: "Dept. of Environmental Science & Engineering",
    university: "Indian School of Mines / IIT (ISM), Dhanbad",
    domains: [ChallengeDomain.ENVIRONMENT, ChallengeDomain.WATER_RESOURCES],
    phone: "+91 90000 20006",
    email: "d.verma@ism.example",
  },
  {
    name: "Dr. Sarita Devi",
    designation: "Head, Dept. of Agriculture Sciences",
    department: "Dept. of Agriculture Sciences",
    university: "Vinoba Bhave University, Hazaribagh",
    domains: [ChallengeDomain.AGRICULTURE, ChallengeDomain.RURAL_LIVELIHOODS],
    phone: "+91 90000 20007",
    email: "s.devi@vbu.example",
  },
  {
    name: "Dr. Rajiv Ranjan",
    designation: "Principal Scientist",
    department: "ICAR Research Complex for Eastern Region",
    university: "ICAR Research Complex for Eastern Region (Jharkhand campus)",
    domains: [ChallengeDomain.AGRICULTURE, ChallengeDomain.WATER_RESOURCES],
    phone: "+91 90000 20008",
    email: "r.ranjan@icar.example",
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

  for (const authority of GOVERNMENT_AUTHORITIES) {
    const cityId = cityByDistrict.get(authority.district);
    if (!cityId) continue;

    const existing = await prisma.authority.findFirst({
      where: { name: authority.name, cityId },
    });
    if (existing) {
      console.log(`  authority (exists): ${authority.name}`);
      continue;
    }

    await prisma.authority.create({
      data: {
        name: authority.name,
        designation: authority.designation,
        department: authority.department,
        phone: authority.phone,
        email: authority.email,
        domains: authority.domains,
        cityId,
      },
    });
    console.log(`  authority: ${authority.name} — ${authority.designation}, ${authority.department} (${authority.district})`);
  }

  for (const authority of UNIVERSITY_AUTHORITIES) {
    const university = await prisma.university.findFirst({ where: { name: authority.university } });
    if (!university) continue;

    const existing = await prisma.authority.findFirst({
      where: { name: authority.name, universityId: university.id },
    });
    if (existing) {
      console.log(`  authority (exists): ${authority.name}`);
      continue;
    }

    await prisma.authority.create({
      data: {
        name: authority.name,
        designation: authority.designation,
        department: authority.department,
        phone: authority.phone,
        email: authority.email,
        domains: authority.domains,
        universityId: university.id,
      },
    });
    console.log(`  authority: ${authority.name} — ${authority.designation} (${authority.university})`);
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
