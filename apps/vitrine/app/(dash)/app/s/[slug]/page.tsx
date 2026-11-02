import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  checkDomain,
  destroySite,
  dropDomain,
  invite,
  memberLink,
  newDomain,
  newPage,
  removePage,
  revoke,
} from "@/app/actions";
import {
  ConfirmButton,
  CopyText,
  InlineForm,
  SimpleForm,
} from "@/components/dash/forms";
import { Ledger } from "@/components/dash/Ledger";
import { SeoPanel } from "@/components/dash/SeoPanel";
import { auditPage, rootOf } from "@/lib/seo";
import { getSeo, publishedPages, siteOrigin } from "@/lib/seo-server";
import { CadastrosPanel } from "@/components/dash/CadastrosPanel";
import { CLASSIC_PARAM, Leads } from "@/components/dash/Leads";
import { TrackingPanel } from "@/components/dash/TrackingPanel";
import { WhatsAppPanel } from "@/components/dash/WhatsAppPanel";
import { Visits } from "@/components/dash/Visits";
import {
  eventSummary,
  getTracking,
  getWhatsApp,
  viewSummary,
} from "@/lib/analytics";
import { listLedger, modelForSite, usageSummary } from "@/lib/credits";
import { listDeliveries, listIntegrations } from "@/lib/integrations";
import { mailConfigured } from "@/lib/mail";
import { parseLimits } from "@/lib/ratelimit";
import { timeAgo } from "@/lib/time";
import { hostingProvider } from "@/lib/hosting";
import { atLeast, HttpError, requireUser } from "@/lib/auth";
import {
  APP_ROOT_DOMAIN,
  listActivity,
  listDomains,
  listLeadForms,
  listLeads,
  listMembers,
  listPages,
  PLATFORM_TARGET,
  siteFor,
} from "@/lib/repo";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string; form?: string }>;
};

const tabs = [
  ["paginas", "Páginas"],
  ["dominios", "Domínios"],
  ["equipe", "Equipe"],
  ["contatos", "Contatos"],
  ["cadastros", "Cadastros"],
  ["visitas", "Visitas"],
  ["rastreamento", "Rastreamento"],
  ["whatsapp", "WhatsApp"],
  ["seo", "SEO e IAs"],
  ["creditos", "IA e créditos"],
  ["atividade", "Atividade"],
] as const;

/** Tabs only site administrators see (their content is also checked below). */
const ADMIN_TABS = new Set([
  "cadastros",
  "creditos",
  "rastreamento",
  "whatsapp",
  "seo",
]);

const statusLabel: Record<string, string> = {
  pending: "Aguardando DNS",
  verified: "Propriedade confirmada",
  active: "Ativo",
};

export async function generateMetadata({ params }: Params) {
  return { title: (await params).slug };
}

export default async function SitePage({ params, searchParams }: Params) {
  const user = await requireUser();
  const { slug } = await params;
  const query = await searchParams;
  const tab = query.tab ?? "paginas";
  let ctx;
  try {
    ctx = siteFor(user, slug);
  } catch (e) {
    if (e instanceof HttpError && e.status === 404) notFound();
    redirect("/app");
  }
  const { site, role } = ctx;
  const isAdmin = atLeast(role, "admin");
  const liveUrl = `/sites/${site.slug}`;
  const usage = usageSummary(site.id);
  let aiModel = { label: "Nenhum modelo ativo" };
  try {
    aiModel = modelForSite(site.id);
  } catch {}

  return (
    <div className="d-page">
      <Link href="/app" className="d-back">
        ← Sites
      </Link>
      <div className="d-page-head">
        <div>
          <h1>{site.name}</h1>
          <p className="d-muted">
            Endereço provisório:{" "}
            <code>
              {site.slug}.{APP_ROOT_DOMAIN}
            </code>{" "}
            ·{" "}
            <a href={liveUrl} target="_blank" rel="noreferrer">
              ver o site publicado
            </a>
          </p>
        </div>
        <Link
          href={`/app/s/${site.slug}/edit?path=/`}
          className="d-btn d-btn-primary"
        >
          Abrir editor
        </Link>
      </div>

      <nav className="d-tabs" aria-label="Seções do site">
        {tabs
          .filter(([id]) => !ADMIN_TABS.has(id) || isAdmin)
          .map(([id, label]) => (
            <Link
              key={id}
              href={`?tab=${id}`}
              className={tab === id ? "is-active" : undefined}
              aria-current={tab === id ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
      </nav>

      {tab === "paginas" && (
        <section className="d-card">
          <table className="d-table">
            <thead>
              <tr>
                <th>Página</th>
                <th>Situação</th>
                <th>Última edição</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {listPages(site.id).map((p) => (
                <tr key={p.path}>
                  <td>
                    <strong>
                      {p.title || (p.path === "/" ? "Página inicial" : p.path)}
                    </strong>
                    <small>{p.path}</small>
                  </td>
                  <td>
                    {p.review_requested ? (
                      <span className="d-flag d-flag-warn">
                        Aguardando revisão
                      </span>
                    ) : p.published_version === null ? (
                      <span className="d-flag">Nunca publicada</span>
                    ) : p.has_changes ? (
                      <span className="d-flag d-flag-info">
                        Versão {p.published_version} no ar · rascunho com
                        mudanças
                      </span>
                    ) : (
                      <span className="d-flag d-flag-ok">
                        Versão {p.published_version} no ar
                      </span>
                    )}
                  </td>
                  <td className="d-muted">
                    {timeAgo(p.updated_at)}
                    {p.updated_by_name ? ` por ${p.updated_by_name}` : ""}
                  </td>
                  <td className="d-row-actions">
                    <Link
                      href={`/app/s/${site.slug}/edit?path=${encodeURIComponent(
                        p.path
                      )}`}
                      className="d-btn d-btn-sm"
                    >
                      Editar
                    </Link>
                    {p.published_version !== null && (
                      <a
                        href={`${liveUrl}${p.path === "/" ? "" : p.path}`}
                        target="_blank"
                        rel="noreferrer"
                        className="d-btn d-btn-ghost d-btn-sm"
                      >
                        Ver
                      </a>
                    )}
                    {isAdmin && p.path !== "/" && (
                      <ConfirmButton
                        action={removePage.bind(null, site.slug, p.path)}
                        label="Apagar"
                        confirmLabel="Apagar página"
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {isAdmin && (
            <div className="d-card-foot">
              <h3>Nova página</h3>
              <InlineForm
                action={newPage.bind(null, site.slug)}
                submit="Criar página"
                pendingText="Criando…"
              >
                <input
                  id="page-title"
                  name="title"
                  placeholder="Título (ex.: Sobre nós)"
                  required
                  aria-label="Título"
                />
                <input
                  id="page-path"
                  name="path"
                  placeholder="Endereço (ex.: /sobre)"
                  required
                  aria-label="Endereço"
                />
              </InlineForm>
              <p className="d-muted d-small">
                A página nova já vem com o menu e o rodapé do site. Monte o
                resto com blocos ou peça à IA.
              </p>
            </div>
          )}
        </section>
      )}

      {tab === "dominios" && (
        <section className="d-card">
          <h2>Domínio próprio</h2>
          <p className="d-muted">
            O cliente continua dono do domínio. Ele só cria dois registros no
            DNS (no Registro.br ou onde estiver). Não altere os registros de
            e-mail (MX) nem troque os servidores DNS.
          </p>
          {listDomains(site.id).map((d) => (
            <div key={d.id} className="d-domain">
              <div className="d-domain-head">
                <strong>{d.host}</strong>
                <span
                  className={`d-flag ${
                    d.status === "active"
                      ? "d-flag-ok"
                      : d.status === "verified"
                      ? "d-flag-info"
                      : "d-flag-warn"
                  }`}
                >
                  {statusLabel[d.status] ?? d.status}
                </span>
                {isAdmin && (
                  <span className="d-row-actions">
                    <form action={checkDomain.bind(null, site.slug, d.id)}>
                      <button className="d-btn d-btn-sm" type="submit">
                        Verificar agora
                      </button>
                    </form>
                    <ConfirmButton
                      action={dropDomain.bind(null, site.slug, d.id)}
                      label="Remover"
                      confirmLabel="Remover domínio"
                    />
                  </span>
                )}
              </div>
              <div className="d-table-wrap">
                <table className="d-table d-dns">
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Nome</th>
                      <th>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>TXT</td>
                      <td>
                        <code>_vitrine.{d.host}</code>
                      </td>
                      <td>
                        <CopyText text={d.token} />
                      </td>
                    </tr>
                    <tr>
                      <td>CNAME</td>
                      <td>
                        <code>{d.host}</code>
                      </td>
                      <td>
                        <CopyText text={PLATFORM_TARGET} />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="d-muted d-small">
                {d.last_check
                  ? `Última verificação ${timeAgo(d.last_check)}. `
                  : "Ainda não verificado. "}
                {d.last_error}
                {d.host.split(".").length === 2 &&
                  " Domínio sem www não aceita CNAME: use um registro A com o IP da plataforma, ou o recurso ALIAS do seu provedor de DNS."}
              </p>
            </div>
          ))}
          {isAdmin && (
            <div className="d-card-foot">
              <InlineForm
                action={newDomain.bind(null, site.slug)}
                submit="Adicionar domínio"
                pendingText="Adicionando…"
              >
                <input
                  id="domain-host"
                  name="host"
                  placeholder="www.cliente.com.br"
                  required
                  aria-label="Domínio"
                />
              </InlineForm>
              <p className="d-muted d-small">
                {hostingProvider() === "vercel"
                  ? "O domínio é ligado ao projeto na Vercel, que emite e renova o certificado HTTPS quando o DNS apontar para a plataforma."
                  : "O certificado HTTPS é emitido na primeira visita pelo Caddy (TLS sob demanda), que consulta a plataforma antes de emitir. Veja deploy/Caddyfile."}
              </p>
            </div>
          )}
        </section>
      )}

      {tab === "equipe" && (
        <section className="d-card">
          <h2>Quem edita este site</h2>
          <ul className="d-roles-help">
            <li>
              <strong>Administrador</strong> edita, publica, restaura versões,
              cria páginas, liga domínios e convida pessoas.
            </li>
            <li>
              <strong>Editor</strong> edita textos e imagens e envia para
              revisão. Não publica nem apaga blocos.
            </li>
          </ul>
          <table className="d-table">
            <tbody>
              {listMembers(site.id).map((m) => (
                <tr key={m.id}>
                  <td>
                    <strong>{m.name}</strong>
                    <small>{m.email}</small>
                  </td>
                  <td>
                    <span className="d-badge">
                      {m.role === "admin" ? "Administrador" : "Editor"}
                    </span>
                  </td>
                  <td className="d-row-actions">
                    {isAdmin && m.id !== user.id && (
                      <>
                        <SimpleForm
                          action={memberLink.bind(null, site.slug, m.id)}
                          submit="Gerar link de acesso"
                          pendingText="Gerando…"
                          className="d-link-form"
                          submitClass="d-btn d-btn-sm"
                        />
                        <ConfirmButton
                          action={revoke.bind(null, site.slug, m.id)}
                          label="Remover acesso"
                          confirmLabel="Remover"
                        />
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {isAdmin && (
            <div className="d-card-foot">
              <h3>Dar acesso</h3>
              <InlineForm
                action={invite.bind(null, site.slug)}
                submit="Dar acesso"
                pendingText="Salvando…"
              >
                <input
                  id="member-name"
                  name="name"
                  placeholder="Nome"
                  aria-label="Nome"
                />
                <input
                  id="member-email"
                  name="email"
                  type="email"
                  placeholder="email@cliente.com.br"
                  required
                  aria-label="E-mail"
                />
                <select
                  id="member-role"
                  name="role"
                  aria-label="Papel"
                  defaultValue="editor"
                >
                  <option value="editor">Editor</option>
                  <option value="admin">Administrador</option>
                </select>
              </InlineForm>
            </div>
          )}
        </section>
      )}

      {tab === "contatos" &&
        (() => {
          const formParam = query.form;
          const active =
            formParam === undefined
              ? undefined
              : formParam === CLASSIC_PARAM
              ? ""
              : formParam;
          return (
            <Leads
              slug={site.slug}
              leads={listLeads(site.id, active ?? null)}
              forms={listLeadForms(site.id)}
              active={active}
              canExport={isAdmin}
            />
          );
        })()}

      {tab === "cadastros" && isAdmin && (
        <CadastrosPanel
          slug={site.slug}
          integrations={listIntegrations(site.id)}
          deliveries={listDeliveries(site.id)}
          mailOn={mailConfigured()}
          limits={parseLimits(site.limits)}
          isPlatformAdmin={!!user.is_super_admin}
        />
      )}

      {tab === "visitas" && (
        <Visits
          summary={viewSummary(site.id, 30)}
          enabled={getTracking(site).views}
          whatsapp={eventSummary(site.id, "whatsapp", 30)}
          bubbleOn={!!getWhatsApp(site).number}
          leads30={
            listLeads(site.id).filter(
              (l) => Date.now() - Date.parse(l.created_at + "Z") < 30 * 864e5
            ).length
          }
        />
      )}

      {tab === "rastreamento" && isAdmin && (
        <TrackingPanel
          slug={site.slug}
          tracking={getTracking(site)}
          headScript={site.head_script}
          isPlatformAdmin={!!user.is_super_admin}
        />
      )}

      {tab === "seo" && isAdmin && (
        <SeoPanel
          slug={site.slug}
          seo={getSeo(site)}
          origin={siteOrigin(site)}
          isPlatformAdmin={!!user.is_super_admin}
          audits={publishedPages(site.id)
            .sort((a, b) => a.path.localeCompare(b.path))
            .map((p) => ({
              path: p.path,
              title: rootOf(p.data).title ?? "",
              audit: auditPage(p.data, { name: site.name }),
            }))}
        />
      )}

      {tab === "whatsapp" && isAdmin && (
        <WhatsAppPanel
          slug={site.slug}
          whatsapp={getWhatsApp(site)}
          pages={listPages(site.id).map((p) => ({
            path: p.path,
            title: p.title,
          }))}
        />
      )}

      {tab === "creditos" && isAdmin && (
        <section className="d-card">
          <h2>IA e créditos</h2>
          <p className="d-muted">
            Cada pedido ao assistente de IA gasta créditos conforme os tokens
            usados. Para adicionar créditos, fale com a agência.
          </p>
          <div className="d-stats">
            <div>
              <span className="d-muted">Saldo</span>
              <strong className={site.credits <= 0 ? "d-neg" : undefined}>
                {site.credits.toLocaleString("pt-BR")}
              </strong>
            </div>
            <div>
              <span className="d-muted">Usados em 30 dias</span>
              <strong>{usage.credits.toLocaleString("pt-BR")}</strong>
            </div>
            <div>
              <span className="d-muted">Modelo</span>
              <strong>{aiModel.label}</strong>
            </div>
          </div>
          <Ledger rows={listLedger(site.id, 50)} />
        </section>
      )}

      {tab === "atividade" && (
        <section className="d-card">
          <h2>Atividade</h2>
          <ol className="d-activity">
            {listActivity(site.id).map((a, i) => (
              <li key={i}>
                <span className={`d-dot d-dot-${a.kind}`} aria-hidden />
                <span>
                  <strong>{a.who ?? "Sistema"}</strong> {a.detail}
                </span>
                <time className="d-muted">{timeAgo(a.created_at)}</time>
              </li>
            ))}
          </ol>
          {role === "owner" && (
            <div className="d-card-foot d-danger-zone">
              <h3>Excluir site</h3>
              <p className="d-muted d-small">
                Apaga o site, todas as páginas, versões, domínios e contatos.
                Não dá para desfazer.
              </p>
              <ConfirmButton
                action={destroySite.bind(null, site.slug)}
                label="Excluir este site"
                confirmLabel="Excluir definitivamente"
                className="d-btn d-btn-danger d-btn-sm"
              />
            </div>
          )}
        </section>
      )}
    </div>
  );
}
