import Link from "next/link";
import { timeAgo } from "@/lib/time";
import { answersOf, formLabel, originOf, type LeadRow } from "@/lib/signup";
import { sourceLabel } from "@/lib/tracking";

/** The classic contact form has no name, so it gets a stand-in in the URL. */
export const CLASSIC_PARAM = "__classic";

export function Leads({
  slug,
  leads,
  forms,
  active,
  canExport,
}: {
  slug: string;
  leads: LeadRow[];
  forms: { form: string; n: number }[];
  /** undefined = all forms; otherwise the form name ("" = classic). */
  active: string | undefined;
  canExport: boolean;
}) {
  const param = (form: string) => (form === "" ? CLASSIC_PARAM : form);
  const href = (form?: string) =>
    form === undefined
      ? "?tab=contatos"
      : `?tab=contatos&form=${encodeURIComponent(param(form))}`;
  const csv = (sep: ";" | ",") =>
    `/api/sites/${slug}/leads.csv?sep=${encodeURIComponent(sep)}${
      active === undefined ? "" : `&form=${encodeURIComponent(param(active))}`
    }`;
  const total = forms.reduce((n, f) => n + f.n, 0);
  return (
    <section className="d-card">
      <h2>Contatos recebidos</h2>
      <p className="d-muted">
        Tudo o que chega pelos blocos &quot;Cadastro&quot; e &quot;Formulário de
        contato&quot; do site.
      </p>
      {forms.length > 1 && (
        <nav className="d-chips" aria-label="Filtrar por formulário">
          <Link
            href={href()}
            className={active === undefined ? "is-active" : undefined}
          >
            Todos ({total})
          </Link>
          {forms.map((f) => (
            <Link
              key={f.form || CLASSIC_PARAM}
              href={href(f.form)}
              className={active === f.form ? "is-active" : undefined}
            >
              {formLabel(f.form)} ({f.n})
            </Link>
          ))}
        </nav>
      )}
      {canExport && leads.length > 0 && (
        <p className="d-export">
          Baixar planilha (CSV): <a href={csv(";")}>para Excel</a> ·{" "}
          <a href={csv(",")}>para Google Planilhas</a>
        </p>
      )}
      {!leads.length ? (
        <p className="d-empty-inline">Nenhum contato ainda.</p>
      ) : (
        <div className="d-table-wrap">
          <table className="d-table">
            <thead>
              <tr>
                <th>Quando</th>
                <th>Formulário</th>
                <th>Respostas</th>
                <th>Origem</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id}>
                  <td className="d-muted">{timeAgo(l.created_at)}</td>
                  <td>
                    <strong>{formLabel(l.form)}</strong>
                    <small>{l.page}</small>
                    {l.consent ? <small>Consentimento dado</small> : null}
                  </td>
                  <td className="d-answers">
                    {answersOf(l).map((a, i) => (
                      <div key={i}>
                        <span className="d-muted">{a.label}:</span> {a.value}
                      </div>
                    ))}
                  </td>
                  <td className="d-muted">
                    {l.origin ? sourceLabel(originOf(l)) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
