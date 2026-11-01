import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listSites } from "@/lib/repo";
import { timeAgo } from "@/lib/time";

export const metadata = { title: "Sites" };
export const dynamic = "force-dynamic";

const roleLabel = {
  owner: "Agência",
  admin: "Administrador",
  editor: "Editor",
} as const;

export default async function SitesPage() {
  const user = await requireUser();
  const sites = listSites(user);
  return (
    <div className="d-page">
      <div className="d-page-head">
        <div>
          <h1>Sites</h1>
          <p className="d-muted">
            {user.is_super_admin
              ? "Todos os sites dos seus clientes."
              : "Os sites que você pode editar."}
          </p>
        </div>
        {!!user.is_super_admin && (
          <Link href="/app/new" className="d-btn d-btn-primary">
            Novo site
          </Link>
        )}
      </div>
      {sites.length === 0 ? (
        <div className="d-empty">
          <h2>Nenhum site ainda</h2>
          <p>Peça à agência para dar acesso ao seu site.</p>
        </div>
      ) : (
        <div className="d-sites">
          {sites.map((s) => (
            <Link key={s.id} href={`/app/s/${s.slug}`} className="d-site-card">
              <div
                className="d-site-thumb"
                style={{ ["--a" as string]: s.accent }}
                data-theme={s.theme}
              >
                <span>{s.name}</span>
              </div>
              <div className="d-site-body">
                <div className="d-site-title">
                  <strong>{s.name}</strong>
                  <span className="d-badge">{roleLabel[s.role]}</span>
                </div>
                <p className="d-muted">
                  {s.pages} {s.pages === 1 ? "página" : "páginas"} · editado{" "}
                  {timeAgo(s.updated)}
                </p>
                <div className="d-site-flags">
                  {s.reviews > 0 && (
                    <span className="d-flag d-flag-warn">
                      {s.reviews} aguardando revisão
                    </span>
                  )}
                  {s.leads > 0 && (
                    <span className="d-flag">{s.leads} contatos</span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
