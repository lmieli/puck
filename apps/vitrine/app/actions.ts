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
import { saveHeadScript, saveTracking, saveWhatsApp } from "@/lib/analytics";
import {
  addEmailRecipient,
  addWebhook,
  removeIntegration,
  retryDelivery,
  saveLimits,
  testWebhook,
} from "@/lib/integrations";
import { db } from "@/lib/db";
import { attachDomain, detachDomain } from "@/lib/hosting";
import {
  grantCredits,
  removeModel,
  saveModel,
  setSiteModel,
} from "@/lib/credits";
import { mailConfigured } from "@/lib/mail";
import {
  addDomain,
  addMember,
  createPage,
  memberAccessLink,
  requestPasswordReset,
  redeemAccessLink,
  createSite,
  deletePage,
  getSiteBySlug,
  deleteSite,
  removeDomain,
  removeMember,
  verifyDomain,
} from "@/lib/repo";
import type { TemplateId } from "@/lib/templates";

export type FormState =
  | { error?: string; ok?: string; link?: string }
  | undefined;

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
  let host = "";
  const res = await guard(() => {
    host = addDomain(user, slug, String(form.get("host") || ""));
  });
  if (host) await attachDomain(host);
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
  let host: string | null = null;
  await guard(() => {
    host = removeDomain(user, slug, id);
  });
  if (host) await detachDomain(host);
  revalidatePath(`/app/s/${slug}`);
}

export async function invite(
  slug: string,
  _: FormState,
  form: FormData
): Promise<FormState> {
  const user = await requireUser();
  let out: { link: string | null; emailed: boolean } = {
    link: null,
    emailed: false,
  };
  const role = form.get("role") === "admin" ? "admin" : "editor";
  const res = await guard(async () => {
    out = await addMember(
      user,
      slug,
      String(form.get("email") || ""),
      String(form.get("name") || ""),
      role
    );
  });
  revalidatePath(`/app/s/${slug}`);
  if (res?.error) return res;
  if (!out.link) return { ok: "Acesso concedido a um usuário que já existia." };
  return out.emailed
    ? { ok: "Convite enviado por e-mail. O link vale por 7 dias." }
    : {
        ok: "Acesso criado. Envie este link de convite à pessoa (vale por 7 dias):",
        link: out.link,
      };
}

export async function memberLink(
  slug: string,
  memberId: string,
  _: FormState
): Promise<FormState> {
  const user = await requireUser();
  let link = "";
  const res = await guard(() => {
    link = memberAccessLink(user, slug, memberId);
  });
  if (res?.error) return res;
  return { ok: "Link para criar uma nova senha (vale por 2 horas):", link };
}

export async function forgotPassword(
  _: FormState,
  form: FormData
): Promise<FormState> {
  const email = String(form.get("email") || "");
  await requestPasswordReset(email);
  return {
    ok: mailConfigured()
      ? "Se existir uma conta com esse e-mail, enviamos um link para criar uma nova senha."
      : "O envio de e-mail não está ativo neste servidor. Peça ao administrador do seu site um link de acesso.",
  };
}

export async function setPassword(
  token: string,
  _: FormState,
  form: FormData
): Promise<FormState> {
  const password = String(form.get("password") || "");
  if (password !== String(form.get("confirm") || ""))
    return { error: "As senhas não conferem." };
  let userId = "";
  const res = await guard(() => {
    userId = redeemAccessLink(token, password);
  });
  if (res?.error) return res;
  await createSession(userId);
  redirect("/app");
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

/* ------------------------- IA: modelos e créditos ------------------------- */

export async function saveSiteModel(
  slug: string,
  _: FormState,
  form: FormData
): Promise<FormState> {
  const user = await requireUser();
  const res = await guard(() => {
    const site = getSiteBySlug(slug);
    if (!site) throw new HttpError(404, "Site não encontrado.");
    setSiteModel(user, site.id, String(form.get("model") || ""));
    return { ok: "Modelo salvo." };
  });
  revalidatePath("/app/admin");
  return res;
}

export async function giveCredits(
  slug: string,
  _: FormState,
  form: FormData
): Promise<FormState> {
  const user = await requireUser();
  const res = await guard(() => {
    const site = getSiteBySlug(slug);
    if (!site) throw new HttpError(404, "Site não encontrado.");
    const balance = grantCredits(
      user,
      site.id,
      Number(String(form.get("amount") || "").replace(/\./g, "")),
      String(form.get("note") || "")
    );
    return { ok: `Saldo: ${balance.toLocaleString("pt-BR")} créditos.` };
  });
  revalidatePath("/app/admin");
  revalidatePath(`/app/s/${slug}`);
  return res;
}

export async function saveAiModel(
  _: FormState,
  form: FormData
): Promise<FormState> {
  const user = await requireUser();
  const res = await guard(() => {
    saveModel(user, {
      id: String(form.get("id") || ""),
      label: String(form.get("label") || ""),
      inPerMtok: Number(form.get("inPerMtok")),
      outPerMtok: Number(form.get("outPerMtok")),
      enabled: form.get("enabled") === "on",
    });
    return { ok: "Modelo salvo." };
  });
  revalidatePath("/app/admin");
  return res;
}

export async function dropAiModel(id: string) {
  const user = await requireUser();
  await guard(() => removeModel(user, id));
  revalidatePath("/app/admin");
}

export async function saveTrackingAction(
  slug: string,
  _: FormState,
  form: FormData
): Promise<FormState> {
  const user = await requireUser();
  const res = await guard(() => {
    saveTracking(user, slug, Object.fromEntries(form));
    return { ok: "Rastreamento salvo. Vale para as próximas visitas." };
  });
  revalidatePath(`/app/s/${slug}`);
  return res;
}

export async function saveHeadScriptAction(
  slug: string,
  _: FormState,
  form: FormData
): Promise<FormState> {
  const user = await requireUser();
  const res = await guard(() => {
    saveHeadScript(user, slug, String(form.get("headScript") || ""));
    return { ok: "Código salvo. Vale para as próximas visitas." };
  });
  revalidatePath(`/app/s/${slug}`);
  return res;
}

export async function saveWhatsAppAction(
  slug: string,
  _: FormState,
  form: FormData
): Promise<FormState> {
  const user = await requireUser();
  const res = await guard(() => {
    saveWhatsApp(user, slug, {
      ...Object.fromEntries(form),
      // Repeated checkboxes: fromEntries would keep only the last one.
      paths: form.getAll("paths").map(String),
    });
    return { ok: "WhatsApp salvo. O balão aparece nas próximas visitas." };
  });
  revalidatePath(`/app/s/${slug}`);
  return res;
}

export async function addEmailAction(
  slug: string,
  _: FormState,
  form: FormData
): Promise<FormState> {
  const user = await requireUser();
  const res = await guard(() => {
    addEmailRecipient(user, slug, String(form.get("email") || ""));
    return { ok: "Pronto. Esse e-mail recebe um aviso a cada novo cadastro." };
  });
  revalidatePath(`/app/s/${slug}`);
  return res;
}

export async function addWebhookAction(
  slug: string,
  _: FormState,
  form: FormData
): Promise<FormState> {
  const user = await requireUser();
  const res = await guard(() => {
    const { secret } = addWebhook(
      user,
      slug,
      String(form.get("name") || ""),
      String(form.get("url") || "")
    );
    return {
      ok: "Webhook adicionado. Copie a chave de assinatura agora: ela não aparece de novo. Use-a só se quiser conferir a autenticidade dos envios.",
      link: secret,
    };
  });
  revalidatePath(`/app/s/${slug}`);
  return res;
}

export async function removeIntegrationAction(slug: string, id: string) {
  const user = await requireUser();
  await guard(() => removeIntegration(user, slug, id));
  revalidatePath(`/app/s/${slug}`);
}

export async function testWebhookAction(
  slug: string,
  id: string
): Promise<FormState> {
  const user = await requireUser();
  const res = await guard(async () => {
    const r = await testWebhook(user, slug, id);
    return r.ok ? { ok: r.message } : { error: r.message };
  });
  revalidatePath(`/app/s/${slug}`);
  return res;
}

export async function retryDeliveryAction(slug: string, id: string) {
  const user = await requireUser();
  await guard(() => retryDelivery(user, slug, id));
  revalidatePath(`/app/s/${slug}`);
}

export async function saveLimitsAction(
  slug: string,
  _: FormState,
  form: FormData
): Promise<FormState> {
  const user = await requireUser();
  const res = await guard(() => {
    saveLimits(user, slug, Object.fromEntries(form));
    return { ok: "Limites salvos." };
  });
  revalidatePath(`/app/s/${slug}`);
  return res;
}
