import Link from "next/link";
import { redirect } from "next/navigation";
import { newSite } from "@/app/actions";
import { NewSiteForm } from "@/components/dash/forms";
import { aiConfigured } from "@/ai/agent";
import { requireUser } from "@/lib/auth";
import { templates } from "@/lib/templates";

export const metadata = { title: "Novo site" };

export default async function NewSitePage() {
  const user = await requireUser();
  if (!user.is_super_admin) redirect("/app");
  return (
    <div className="d-page d-page-narrow">
      <Link href="/app" className="d-back">
        ← Sites
      </Link>
      <h1>Novo site</h1>
      <p className="d-muted">
        O site começa com um endereço provisório. Você liga o domínio do cliente
        depois.
      </p>
      {!aiConfigured() && (
        <p className="d-feedback d-feedback-warn">
          A IA não está ativa neste servidor (falta{" "}
          <code>ANTHROPIC_API_KEY</code>). Use um modelo por enquanto.
        </p>
      )}
      <NewSiteForm action={newSite} templates={templates} />
    </div>
  );
}
