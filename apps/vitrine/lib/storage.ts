import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { uploadsDir } from "./db";

// File storage for uploads. With VITRINE_S3_BUCKET set, files go to any
// S3-compatible service (AWS S3, Cloudflare R2, MinIO…); otherwise they are
// written to the local data folder and served by /media.

const bucket = process.env.VITRINE_S3_BUCKET;

export const storageMode = bucket ? "s3" : "local";

async function s3() {
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  const client = new S3Client({
    region: process.env.VITRINE_S3_REGION || "auto",
    endpoint: process.env.VITRINE_S3_ENDPOINT || undefined,
    forcePathStyle: !!process.env.VITRINE_S3_ENDPOINT,
  });
  return { client, PutObjectCommand };
}

export async function saveUpload(
  siteId: string,
  name: string,
  body: Buffer,
  contentType: string
) {
  if (bucket) {
    const { client, PutObjectCommand } = await s3();
    const key = `${siteId}/${name}`;
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      })
    );
    const base = (process.env.VITRINE_S3_PUBLIC_URL || "").replace(/\/$/, "");
    if (!base)
      throw new Error(
        "Defina VITRINE_S3_PUBLIC_URL com o endereço público do bucket."
      );
    return `${base}/${key}`;
  }
  const dir = path.join(/*turbopackIgnore: true*/ uploadsDir(), siteId);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(/*turbopackIgnore: true*/ dir, name), body);
  return `/media/${siteId}/${name}`;
}
