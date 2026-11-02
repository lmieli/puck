import Link from "next/link";
import { redirect } from "next/navigation";
import {
  dropAiModel,
  giveCredits,
  saveAiModel,
  saveSiteModel,
} from "@/app/actions";
import { ConfirmButton, InlineForm } from "@/components/dash/forms";
import { Ledger } from "@/components/dash/Ledger";
import { requireUser } from "@/lib/auth";
import { listLedger, listModels, usageSummary } from "@/lib/credits";
import { db } from "@/lib/db";
import type { Site } from "@/lib/repo";

export const metadata = { title: "IA e créditos" };
export const dynamic = "force-dynamic";

const n = (v: number) => v.toLocaleString("pt-BR");

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string }>;
}) {
  const user = await requireUser();
  if (!user.is_super_admin) redirect("/app");
  const open = (await searchParams).site;
  const sites = db()
    .prepare("SELECT * FROM sites ORDER BY name")
    .all() as Site[];
  const models = listModels();
  const enabled = models.filter((m) => m.enabled);

  return (
    <div className="d-page">
      <div className="d-page-head">
        <div>
          <h1>IA e créditos</h1>
          <p className="d-muted">
            Escolha o modelo de cada cliente e controle os créditos. Cada pedido
            à IA gasta créditos conforme os tokens realmente usados.
          </p>
        </div>
      </div>

      <section className="d-card">
        <h2>Clientes</h2>
        <div className="d-table-wrap">
          <table className="d-table d-admin">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Modelo</th>
                <th>Saldo</th>
                <th>Últimos 30 dias</th>
                <th>Adicionar créditos</th>
              </tr>
            </thead>
            <tbody>
              {sites.map((s) => {
                const u = usageSummary(s.id);
                return (
                  <tr key={s.id} id={s.slug}>
                    <td>
                      <strong>{s.name}</strong>
                      <small>
                        <Link href={`/app/admin?site=${s.slug}#${s.slug}`}>
                          ver movimentos
                        </Link>
                      </small>
                    </td>
                    <td>
                      <InlineForm
                        action={saveSiteModel.bind(null, s.slug)}
                        submit="Salvar"
                        pendingText="Salvando…"
                      >
                        <select
                          name="model"
                          defaultValue={s.ai_model ?? ""}
                          aria-label={`Modelo de ${s.name}`}
                        >
                          <option value="">Padrão da plataforma</option>
                          {models
                            .filter((m) => m.enabled || m.id === s.ai_model)
                            .map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.label}
                                {m.enabled ? "" : " (desativado)"}
                              </option>
                            ))}
                        </select>
                      </InlineForm>
                    </td>
                    <td>
                      <strong className={s.credits <= 0 ? "d-neg" : undefined}>
                        {n(s.credits)}
                      </strong>
                    </td>
                    <td>
                      {n(u.credits)} créditos
                      <small>
                        {u.calls} chamadas ·{" "}
                        {n(u.input_tokens + u.output_tokens)} tokens
                      </small>
                    </td>
                    <td>
                      <InlineForm
                        action={giveCredits.bind(null, s.slug)}
                        submit="Aplicar"
                        pendingText="…"
                      >
                        <input
                          name="amount"
                          inputMode="numeric"
                          placeholder="ex.: 5000 ou -200"
                          aria-label={`Créditos para ${s.name}`}
                          required
                        />
                        <input
                          name="note"
                          placeholder="Observação (plano, cobrança…)"
                          aria-label="Observação"
                        />
                      </InlineForm>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {open && sites.find((s) => s.slug === open) && (
          <div className="d-card-foot">
            <h3>Movimentos de {sites.find((s) => s.slug === open)!.name}</h3>
            <Ledger
              rows={listLedger(sites.find((s) => s.slug === open)!.id, 100)}
            />
          </div>
        )}
      </section>

      <section className="d-card">
        <h2>Modelos disponíveis</h2>
        <p className="d-muted">
          Use o identificador do modelo na OpenRouter (por exemplo{" "}
          <code>anthropic/claude-sonnet-5.5</code>). O preço é em créditos por 1
          milhão de tokens, separado para entrada e saída: defina acima do custo
          do provedor para ter margem. Os valores iniciais são exemplos (1
          crédito = US$ 0,001 sem margem) e precisam ser conferidos na
          OpenRouter.
        </p>
        <p className="d-small d-muted d-model-cols">
          Cada linha: identificador · nome · créditos por 1M tokens de{" "}
          <strong>entrada</strong> · créditos por 1M tokens de{" "}
          <strong>saída</strong> · ativo.
        </p>
        {models.map((m) => (
          <div key={m.id} className="d-model-row">
            <InlineForm
              action={saveAiModel}
              submit="Salvar"
              pendingText="Salvando…"
            >
              <input type="hidden" name="id" value={m.id} />
              <code className="d-model-id">{m.id}</code>
              <input
                name="label"
                defaultValue={m.label}
                aria-label="Nome"
                required
              />
              <input
                name="inPerMtok"
                type="number"
                min={0}
                defaultValue={m.in_per_mtok}
                aria-label={`Entrada, créditos por 1M tokens (${m.id})`}
                title="Entrada: créditos por 1M de tokens"
              />
              <input
                name="outPerMtok"
                type="number"
                min={0}
                defaultValue={m.out_per_mtok}
                aria-label={`Saída, créditos por 1M tokens (${m.id})`}
                title="Saída: créditos por 1M de tokens"
              />
              <label className="d-check">
                <input
                  type="checkbox"
                  name="enabled"
                  defaultChecked={!!m.enabled}
                />
                Ativo
              </label>
            </InlineForm>
            <ConfirmButton
              action={dropAiModel.bind(null, m.id)}
              label="Remover"
              confirmLabel="Remover modelo"
            />
          </div>
        ))}
        <div className="d-card-foot">
          <h3>Adicionar modelo</h3>
          <InlineForm
            action={saveAiModel}
            submit="Adicionar"
            pendingText="Adicionando…"
          >
            <input
              name="id"
              placeholder="provedor/modelo"
              aria-label="Identificador na OpenRouter"
              required
            />
            <input name="label" placeholder="Nome para exibir" required />
            <input
              name="inPerMtok"
              type="number"
              min={0}
              placeholder="Entrada /1M"
              required
            />
            <input
              name="outPerMtok"
              type="number"
              min={0}
              placeholder="Saída /1M"
              required
            />
            <label className="d-check">
              <input type="checkbox" name="enabled" defaultChecked />
              Ativo
            </label>
          </InlineForm>
        </div>
        {enabled.length === 0 && (
          <p className="d-feedback d-feedback-error">
            Nenhum modelo ativo: a IA não vai funcionar.
          </p>
        )}
      </section>
    </div>
  );
}
