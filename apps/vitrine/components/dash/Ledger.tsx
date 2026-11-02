import type { LedgerRow } from "@/lib/credits";
import { timeAgo } from "@/lib/time";

const kindLabel = {
  grant: "Crédito adicionado",
  adjust: "Ajuste",
  usage: "Uso da IA",
} as const;

export function Ledger({ rows }: { rows: LedgerRow[] }) {
  if (!rows.length) return <p className="d-muted">Nenhum movimento ainda.</p>;
  return (
    <div className="d-table-wrap">
      <table className="d-table">
        <thead>
          <tr>
            <th>Quando</th>
            <th>O quê</th>
            <th>Tokens (entrada / saída)</th>
            <th>Créditos</th>
            <th>Saldo</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{timeAgo(r.created_at)}</td>
              <td>
                <strong>{kindLabel[r.kind]}</strong>
                <small>
                  {[r.model, r.user_name, r.note].filter(Boolean).join(" · ")}
                </small>
              </td>
              <td>
                {r.kind === "usage"
                  ? `${r.input_tokens.toLocaleString(
                      "pt-BR"
                    )} / ${r.output_tokens.toLocaleString("pt-BR")}`
                  : "—"}
              </td>
              <td className={r.amount < 0 ? "d-neg" : "d-pos"}>
                {r.amount > 0 ? "+" : ""}
                {r.amount.toLocaleString("pt-BR")}
              </td>
              <td>{r.balance_after.toLocaleString("pt-BR")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
