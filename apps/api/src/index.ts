import "./bootstrap-env";
import express from "express";
import cors from "cors";
import { prisma } from "./lib/prisma";
import { authRouter } from "./routes/auth.routes";
import { issueRouter } from "./routes/issue.routes";
import { photoRouter } from "./routes/photo.routes";
import { aiRouter } from "./routes/ai.routes";
import { analyticsRouter } from "./routes/analytics.routes";
import { universityRouter } from "./routes/university.routes";
import { industryPartnerRouter } from "./routes/industryPartner.routes";
import { authorityRouter } from "./routes/authority.routes";
import { auditRouter } from "./routes/audit.routes";
import { cityRouter } from "./routes/city.routes";

const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(cors());
app.use(express.json({ limit: "2mb" }));

// Health check that also confirms Prisma can actually reach Postgres,
// not just that the Express process is alive.
app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", db: "connected" });
  } catch (error) {
    console.error("Database health check failed:", error);
    const message = error instanceof Error ? error.message : String(error);
    const db =
      /Authentication failed|credentials/i.test(message)
        ? "auth_failed"
        : /Can't reach database server|P1001/i.test(message)
          ? "unreachable"
          : "error";
    res.status(500).json({ status: "error", db });
  }
});

app.use("/api/auth", authRouter);
// Mount before /api/issues so /photos is not swallowed by /:id.
app.use("/api/issues/photos", photoRouter);
app.use("/api/issues", issueRouter);
app.use("/api/ai", aiRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/universities", universityRouter);
app.use("/api/industry-partners", industryPartnerRouter);
app.use("/api/authorities", authorityRouter);
app.use("/api/audit", auditRouter);
app.use("/api/cities", cityRouter);

// Express 5 forwards rejected promises from async route handlers here
// automatically, so this catches anything a route didn't handle itself
// (e.g. an unexpected Prisma error) and returns JSON instead of Express's
// default HTML error page.
app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", error);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
