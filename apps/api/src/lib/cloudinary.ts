import "../bootstrap-env";
import { v2 as cloudinary } from "cloudinary";

/**
 * Prefer the three separate dashboard values. This avoids CLOUDINARY_URL
 * protocol / cloud_name parsing issues that crash or reject uploads.
 */
const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

export default cloudinary;

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
      {
        folder: options.folder,
        resource_type: "image",
        allowed_formats: ["jpg", "png", "jpeg", "webp"],
      },
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
