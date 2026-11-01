import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { withUser } from "@/lib/api";
import { HttpError } from "@/lib/auth";
import { uploadsDir } from "@/lib/db";
import { siteFor } from "@/lib/repo";

const TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "model/gltf-binary": "glb",
  "video/mp4": "mp4",
};
const MAX = 10 * 1024 * 1024;

export async function POST(
  req: Request,
  ctx: { params: Promise<{ slug: string }> }
) {
  const { slug } = await ctx.params;
  return withUser(async (user) => {
    const { site } = siteFor(user, slug);
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new HttpError(400, "Envie um arquivo.");
    const byName = file.name.toLowerCase().endsWith(".glb") ? "glb" : undefined;
    const ext = TYPES[file.type] ?? byName;
    if (!ext)
      throw new HttpError(
        415,
        "Formato não suportado. Use PNG, JPG, WebP, GIF, AVIF, MP4 ou GLB."
      );
    if (file.size > MAX) throw new HttpError(413, "Arquivo maior que 10 MB.");
    const dir = path.join(/*turbopackIgnore: true*/ uploadsDir(), site.id);
    await fs.mkdir(dir, { recursive: true });
    const name = `${randomUUID()}.${ext}`;
    await fs.writeFile(
      path.join(/*turbopackIgnore: true*/ dir, name),
      Buffer.from(await file.arrayBuffer())
    );
    return { url: `/media/${site.id}/${name}` };
  });
}
