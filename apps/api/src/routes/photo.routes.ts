import { Router } from "express";
import multer from "multer";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/authenticate";
import { isCloudinaryConfigured, uploadBufferToCloudinary } from "../lib/cloudinary";
import { getPublicApiUrl } from "../lib/publicApiUrl";

export const photoRouter = Router();

let cloudinaryDisabled = false;

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

async function storePhotoInDatabase(
  file: Express.Multer.File,
  uploadedById: string,
  req: Parameters<typeof getPublicApiUrl>[0],
) {
  const photo = await prisma.issuePhoto.create({
    data: {
      mimeType: file.mimetype,
      data: new Uint8Array(file.buffer),
      uploadedById,
    },
  });

  const base = getPublicApiUrl(req);
  return {
    url: `${base}/api/issues/photos/${photo.id}`,
    id: photo.id,
  };
}

/**
 * Authenticated upload — prefers Cloudinary when configured; falls back to
 * Postgres storage so reports still work when Cloudinary credentials are wrong
 * or missing (common during hackathon deploys).
 */
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

    const userId = req.user!.sub;

    if (isCloudinaryConfigured() && !cloudinaryDisabled) {
      try {
        const result = await uploadBufferToCloudinary(file.buffer, {
          folder: "nivaran/issues",
        });

        return res.status(201).json({
          url: result.secure_url,
          id: result.public_id,
        });
      } catch (error) {
        cloudinaryDisabled = true;
        console.error("Cloudinary upload failed, using database fallback:", error);
      }
    }

    try {
      const stored = await storePhotoInDatabase(file, userId, req);
      return res.status(201).json(stored);
    } catch (error) {
      console.error("Database photo upload failed:", error);
      return res.status(500).json({ error: "Failed to upload photo" });
    }
  });
});

/**
 * Serves issue photos stored in Postgres (fallback storage and legacy uploads).
 */
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
