import { Router } from "express";
import multer from "multer";
import { prisma } from "../lib/prisma";
import { authenticate } from "../middleware/authenticate";
import { isCloudinaryConfigured, uploadBufferToCloudinary } from "../lib/cloudinary";

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

/**
 * Authenticated upload — stores the image on Cloudinary and returns its
 * public HTTPS URL. Requires CLOUDINARY_URL (or CLOUDINARY_CLOUD_NAME +
 * CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET) in the environment.
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

    if (!isCloudinaryConfigured()) {
      return res.status(500).json({
        error:
          "Cloudinary is not configured. Set CLOUDINARY_URL (or CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET) in the API environment.",
      });
    }

    try {
      const result = await uploadBufferToCloudinary(file.buffer, {
        folder: "nivaran/issues",
      });

      return res.status(201).json({
        url: result.secure_url,
        id: result.public_id,
      });
    } catch (error) {
      console.error("Cloudinary upload failed:", error);
      return res.status(500).json({ error: "Failed to upload photo" });
    }
  });
});

/**
 * Legacy read route — serves photos uploaded before the Cloudinary
 * migration, which were stored directly in Postgres. New uploads go
 * straight to Cloudinary and never hit this route.
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
