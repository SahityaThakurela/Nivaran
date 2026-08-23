import "../bootstrap-env";
import { v2 as cloudinary } from "cloudinary";

// If CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET are set, use them explicitly.
// Otherwise the SDK auto-configures from CLOUDINARY_URL (the single-string
// value Cloudinary's dashboard calls your "API Environment variable").
if (
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

export function isCloudinaryConfigured(): boolean {
  const config = cloudinary.config();
  return Boolean(config.cloud_name && config.api_key && config.api_secret);
}

export type CloudinaryUploadResult = {
  secure_url: string;
  public_id: string;
};

/** Streams an in-memory buffer (from multer) straight to Cloudinary — no temp files. */
export function uploadBufferToCloudinary(
  buffer: Buffer,
  options: { folder: string },
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: options.folder, resource_type: "image" },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload returned no result"));
          return;
        }
        resolve({ secure_url: result.secure_url, public_id: result.public_id });
      },
    );
    uploadStream.end(buffer);
  });
}
