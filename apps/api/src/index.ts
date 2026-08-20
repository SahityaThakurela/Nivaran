import "dotenv/config";
import express from "express";
import cors from "cors";
import { prisma } from "./lib/prisma";
import { authRouter } from "./routes/auth.routes";
import { issueRouter } from "./routes/issue.routes";

const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(cors());
app.use(express.json());

// Health check that also confirms Prisma can actually reach Postgres,
// not just that the Express process is alive.
app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", db: "connected" });
  } catch (error) {
    console.error("Database health check failed:", error);
    res.status(500).json({ status: "error", db: "unreachable" });
  }
});

app.use("/api/auth", authRouter);
app.use("/api/issues", issueRouter);

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
