"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createSession,
  destroySession,
  HttpError,
  requireUser,
  verifyPassword,
} from "@/lib/auth";
import { db } from "@/lib/db";
import {
  addDomain,
  addMember,
  createPage,
  createSite,
  deletePage,
  deleteSite,
  removeDomain,
  removeMember,
  verifyDomain,
} from "@/lib/repo";
import type { TemplateId } from "@/lib/templates";

export type FormState = { error?: string; ok?: string } | undefined;

async function guard(
  fn: () => Promise<FormState | void> | FormState | void
): Promise<FormState> {
  try {
    return (await fn()) ?? { ok: "Feito." };
  } catch (e) {
    if (e instanceof HttpError) return { error: e.message };
    if ((e as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT"))
      throw e;
    console.error(e);
    return { error: "Algo deu errado. Tente de novo." };
  }
}

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") || "")
    .trim()
    .toLowerCase();
  const password = String(form.get("password") || "");
  const user = db()
    .prepare("SELECT id, password_hash FROM users WHERE email = ?")
    .get(email) as { id: string; password_hash: string } | undefined;
  if (!user || !verifyPassword(password, user.password_hash))
    return { error: "E-mail ou senha incorretos." };
  await createSession(user.id);
  redirect("/app");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

export async function newSite(
  _: FormState,
  form: FormData
): Promise<FormState> {
  const user = await requireUser();
  const name = String(form.get("name") || "").trim();
  const mode = String(form.get("mode") || "template");
  const template = String(form.get("template") || "blank") as TemplateId;
  const brief = String(form.get("brief") || "").trim();
  if (name.length < 2) return { error: "Dê um nome ao site." };
  if (mode === "ai" && brief.length < 10)
    return { error: "Descreva o negócio em pelo menos uma frase." };
  let slug = "";
  const res = await guard(() => {
    slug = createSite(user, name, mode === "ai" ? "blank" : template);
  });
  if (res?.error) return res;
  if (mode === "ai") {
    const prompt = `Crie o site completo de "${name}". Sobre o negócio: ${brief}`;
    redirect(`/app/s/${slug}/edit?path=/&brief=${encodeURIComponent(prompt)}`);
  }
  redirect(`/app/s/${slug}`);
}

export async function newPage(
  slug: string,
  _: FormState,
  form: FormData
): Promise<FormState> {
  const user = await requireUser();
  let path = "";
  const res = await guard(() => {
    path = createPage(
      user,
      slug,
      String(form.get("path") || ""),
      String(form.get("title") || "")
    );
  });
  if (res?.error) return res;
  redirect(`/app/s/${slug}/edit?path=${encodeURIComponent(path)}`);
}

export async function removePage(slug: string, path: string) {
  const user = await requireUser();
  await guard(() => deletePage(user, slug, path));
  revalidatePath(`/app/s/${slug}`);
}

export async function newDomain(
  slug: string,
  _: FormState,
  form: FormData
): Promise<FormState> {
  const user = await requireUser();
  const res = await guard(() =>
    addDomain(user, slug, String(form.get("host") || ""))
  );
  revalidatePath(`/app/s/${slug}`);
  return res?.error
    ? res
    : { ok: "Domínio adicionado. Configure os registros abaixo." };
}

export async function checkDomain(slug: string, id: string) {
  const user = await requireUser();
  await guard(async () => {
    await verifyDomain(user, slug, id);
  });
  revalidatePath(`/app/s/${slug}`);
}

export async function dropDomain(slug: string, id: string) {
  const user = await requireUser();
  await guard(() => removeDomain(user, slug, id));
  revalidatePath(`/app/s/${slug}`);
}

export async function invite(
  slug: string,
  _: FormState,
  form: FormData
): Promise<FormState> {
  const user = await requireUser();
  let temp: string | null = null;
  const role = form.get("role") === "admin" ? "admin" : "editor";
  const res = await guard(() => {
    temp = addMember(
      user,
      slug,
      String(form.get("email") || ""),
      String(form.get("name") || ""),
      role
    );
  });
  revalidatePath(`/app/s/${slug}`);
  if (res?.error) return res;
  return {
    ok: temp
      ? `Acesso criado. Senha provisória: ${temp} (mostrada só agora; envie à pessoa por um canal seguro).`
      : "Acesso concedido a um usuário que já existia.",
  };
}

export async function revoke(slug: string, userId: string) {
  const user = await requireUser();
  await guard(() => removeMember(user, slug, userId));
  revalidatePath(`/app/s/${slug}`);
}

export async function destroySite(slug: string) {
  const user = await requireUser();
  await guard(() => deleteSite(user, slug));
  redirect("/app");
}
