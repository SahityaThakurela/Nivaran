import { Router } from "express";
import multer from "multer";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/authenticate";

export const photoRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
      return;
    }
    cb(new Error("Only image uploads are allowed"));
  },
});

function publicApiBase(req: { protocol: string; get: (name: string) => string | undefined }) {
  const fromEnv = process.env.PUBLIC_API_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  const host = req.get("host");
  if (!host) return "";
  // Render / reverse proxies terminate TLS; prefer x-forwarded-proto when present.
  const proto = (req.get("x-forwarded-proto") ?? req.protocol ?? "https").split(",")[0]?.trim();
  return `${proto}://${host}`;
}

/** Authenticated upload — returns a publicly fetchable HTTPS URL. */
photoRouter.post("/", authenticate, (req, res) => {
  upload.single("photo")(req, res, async (err: unknown) => {
    if (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      return res.status(400).json({ error: message });
    }

    const file = req.file;
    if (!file?.buffer?.length) {
      return res.status(400).json({ error: "photo file is required" });
    }

    try {
      const photo = await prisma.issuePhoto.create({
        data: {
          mimeType: file.mimetype || "image/jpeg",
          data: new Uint8Array(file.buffer),
          uploadedById: req.user!.sub,
        },
      });

      const base = publicApiBase(req);
      if (!base) {
        return res.status(500).json({ error: "PUBLIC_API_URL is not configured" });
      }

      return res.status(201).json({
        url: `${base}/api/issues/photos/${photo.id}`,
        id: photo.id,
      });
    } catch (error) {
      console.error("Photo upload failed:", error);
      return res.status(500).json({ error: "Failed to store photo" });
    }
  });
});

/** Public read — RN <Image> cannot attach Authorization headers. */
photoRouter.get("/:id", async (req, res) => {
  const id = String(req.params.id);

  const photo = await prisma.issuePhoto.findUnique({
    where: { id },
    select: { mimeType: true, data: true },
  });

  if (!photo) {
    return res.status(404).json({ error: "Photo not found" });
  }

  res.setHeader("Content-Type", photo.mimeType);
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  return res.send(Buffer.from(photo.data));
});
