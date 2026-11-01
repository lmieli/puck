import fs from "node:fs/promises";
import path from "node:path";
import { uploadsDir } from "@/lib/db";

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  glb: "model/gltf-binary",
  mp4: "video/mp4",
};

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ path: string[] }> }
) {
  const parts = (await ctx.params).path;
  if (
    parts.length !== 2 ||
    parts.some((p) => !/^[a-zA-Z0-9-]+(\.[a-z0-9]+)?$/.test(p))
  ) {
    return new Response("Not found", { status: 404 });
  }
  const file = path.join(
    /*turbopackIgnore: true*/ uploadsDir(),
    parts[0],
    parts[1]
  );
  try {
    const buf = await fs.readFile(file);
    const ext = parts[1].split(".").pop() ?? "";
    return new Response(new Uint8Array(buf), {
      headers: {
        "content-type": MIME[ext] ?? "application/octet-stream",
        "cache-control": "public, max-age=31536000, immutable",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
