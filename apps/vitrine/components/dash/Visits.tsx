import type { summarizeViews } from "@/lib/tracking";

type Summary = ReturnType<typeof summarizeViews>;

const nf = new Intl.NumberFormat("pt-BR");

function dayLabel(day: string) {
  const [, m, d] = day.split("-");
  return `${d}/${m}`;
}

/** Visits in the last days: a bar per day, plus top pages and sources. */
export function Visits({
  summary,
  enabled,
  leads30,
}: {
  summary: Summary;
  enabled: boolean;
  leads30: number;
}) {
  const max = Math.max(1, ...summary.perDay.map((d) => d.views));
  const avg = summary.total / Math.max(1, summary.perDay.length);
  return (
    <section className="d-card">
      <h2>Visitas</h2>
      <p className="d-muted">
        Contagem simples dos últimos 30 dias, sem cookies e sem guardar dados de
        quem visita. Robôs de busca não entram na conta.
      </p>
      {!enabled && (
        <p className="d-feedback d-feedback-error" role="status">
          A contagem de visitas está desligada. Ative na aba Rastreamento.
        </p>
      )}
      <div className="d-stats">
        <div>
          <span className="d-muted">Visitas</span>
          <strong>{nf.format(summary.total)}</strong>
        </div>
        <div>
          <span className="d-muted">Média por dia</span>
          <strong>{nf.format(Math.round(avg * 10) / 10)}</strong>
        </div>
        <div>
          <span className="d-muted">Contatos recebidos</span>
          <strong>{nf.format(leads30)}</strong>
        </div>
      </div>

      <div
        className="d-bars"
        role="img"
        aria-label={`Visitas por dia nos últimos ${summary.perDay.length} dias`}
      >
        {summary.perDay.map((d) => (
          <div
            key={d.day}
            className="d-bar"
            title={`${dayLabel(d.day)}: ${nf.format(d.views)}`}
          >
            <span
              style={{ height: `${Math.max(2, (d.views / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="d-bars-axis d-muted">
        <span>{dayLabel(summary.perDay[0].day)}</span>
        <span>{dayLabel(summary.perDay[summary.perDay.length - 1].day)}</span>
      </div>

      {summary.total === 0 ? (
        <p className="d-empty-inline">
          Nenhuma visita ainda. Elas aparecem aqui assim que alguém abrir o site
          publicado.
        </p>
      ) : (
        <div className="d-two">
          <div className="d-table-wrap">
            <table className="d-table">
              <thead>
                <tr>
                  <th>Páginas mais vistas</th>
                  <th className="d-num">Visitas</th>
                </tr>
              </thead>
              <tbody>
                {summary.pages.map((p) => (
                  <tr key={p.name}>
                    <td>
                      <code>{p.name}</code>
                    </td>
                    <td className="d-num">{nf.format(p.views)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="d-table-wrap">
            <table className="d-table">
              <thead>
                <tr>
                  <th>De onde vêm</th>
                  <th className="d-num">Visitas</th>
                </tr>
              </thead>
              <tbody>
                {summary.sources.map((s) => (
                  <tr key={s.name}>
                    <td>{s.name}</td>
                    <td className="d-num">{nf.format(s.views)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
