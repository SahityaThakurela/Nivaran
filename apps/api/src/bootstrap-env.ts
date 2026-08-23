import { config as loadEnv } from "dotenv";

loadEnv();

// Cloudinary's SDK throws at import time if CLOUDINARY_URL is set but invalid
// (empty string, placeholder, etc.). Remove it so the app can start without
// Cloudinary; photo routes return a clear error when uploads are attempted.
const cloudinaryUrl = process.env.CLOUDINARY_URL?.trim();
if (!cloudinaryUrl?.startsWith("cloudinary://")) {
  delete process.env.CLOUDINARY_URL;
}
