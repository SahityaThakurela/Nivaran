import { config as loadEnv } from "dotenv";

loadEnv();

// Prefer the three separate Cloudinary vars. A bad/empty CLOUDINARY_URL makes
// the SDK throw at import time before we can call cloudinary.config().
const hasExplicit =
  Boolean(process.env.CLOUDINARY_CLOUD_NAME?.trim()) &&
  Boolean(process.env.CLOUDINARY_API_KEY?.trim()) &&
  Boolean(process.env.CLOUDINARY_API_SECRET?.trim());

if (hasExplicit) {
  delete process.env.CLOUDINARY_URL;
} else {
  const cloudinaryUrl = process.env.CLOUDINARY_URL?.trim();
  if (!cloudinaryUrl?.startsWith("cloudinary://")) {
    delete process.env.CLOUDINARY_URL;
  }
}
