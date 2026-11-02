import {
  addEmailAction,
  addWebhookAction,
  removeIntegrationAction,
  retryDeliveryAction,
  saveLimitsAction,
  testWebhookAction,
} from "@/app/actions";
import {
  ActionButton,
  ConfirmButton,
  InlineForm,
  SimpleForm,
} from "@/components/dash/forms";
import {
  MAX_EMAILS,
  MAX_WEBHOOKS,
  type DeliveryView,
  type IntegrationView,
} from "@/lib/integrations";
import type { Limits } from "@/lib/ratelimit";
import { webhookPayload, type LeadRow } from "@/lib/signup";
import { timeAgo } from "@/lib/time";

const STATUS: Record<DeliveryView["status"], [string, string]> = {
  pending: ["Aguardando", "d-flag-warn"],
  sending: ["Enviando", "d-flag-info"],
  sent: ["Enviado", "d-flag-ok"],
  failed: ["Falhou", "d-flag-bad"],
};

const SAMPLE_LEAD: LeadRow = {
  id: "3f1c0d9e-…",
  page: "/",
  name: "Maria Souza",
  email: "maria@exemplo.com",
  phone: "(11) 91234-5678",
  message: "",
  origin: JSON.stringify({ utm_source: "google", utm_medium: "cpc" }),
  form: "Lista de espera",
  data: JSON.stringify({
    answers: [
      { key: "f0", label: "Nome", kind: "name", value: "Maria Souza" },
      { key: "f1", label: "E-mail", kind: "email", value: "maria@exemplo.com" },
      { key: "f2", label: "Interesse", kind: "choice", value: "3 quartos" },
    ],
    consentText: "Concordo em compartilhar meus dados para receber contato.",
  }),
  consent: 1,
  created_at: "2026-11-02 12:00:00",
};

export function CadastrosPanel({
  slug,
  integrations,
  deliveries,
  mailOn,
  limits,
  isPlatformAdmin,
}: {
  slug: string;
  integrations: IntegrationView[];
  deliveries: DeliveryView[];
  mailOn: boolean;
  limits: Limits;
  isPlatformAdmin: boolean;
}) {
  const emails = integrations.filter((i) => i.kind === "email");
  const hooks = integrations.filter((i) => i.kind === "webhook");
  return (
    <>
      <section className="d-card">
        <h2>Aviso por e-mail</h2>
        <p className="d-muted">
          Cada cadastro novo manda um e-mail para quem você listar aqui, com as
          respostas e a origem. O contato fica sempre guardado na aba Contatos,
          mesmo que o e-mail falhe.
        </p>
        {!mailOn && (
          <p className="d-feedback d-feedback-error" role="status">
            O envio de e-mail ainda não está configurado neste servidor
            (RESEND_API_KEY e VITRINE_MAIL_FROM). Você pode cadastrar os
            endereços agora, mas os avisos só saem depois disso.
          </p>
        )}
        {emails.map((e) => (
          <div key={e.id} className="d-integration">
            <strong>{e.display}</strong>
            <span className="d-row-actions">
              <ConfirmButton
                action={removeIntegrationAction.bind(null, slug, e.id)}
                label="Remover"
                confirmLabel="Remover aviso"
              />
            </span>
          </div>
        ))}
        {emails.length < MAX_EMAILS && (
          <InlineForm
            action={addEmailAction.bind(null, slug)}
            submit="Adicionar"
            pendingText="Adicionando…"
          >
            <input
              name="email"
              type="email"
              required
              placeholder="atendimento@empresa.com.br"
              autoComplete="off"
            />
          </InlineForm>
        )}
      </section>

      <section className="d-card">
        <h2>Webhook (Zapier, Make, n8n e outros)</h2>
        <p className="d-muted">
          A cada cadastro novo enviamos os dados em JSON para o endereço que
          você colar. É o caminho para levar os contatos ao Notion, ao Google
          Planilhas, a um CRM ou a um aviso no Slack, usando a ferramenta de
          automação que você já tem. Só aceitamos endereços https públicos.
        </p>
        {hooks.map((h) => (
          <div key={h.id} className="d-integration">
            <span>
              <strong>{h.name}</strong>
              <small className="d-muted"> {h.display}</small>
            </span>
            <span className="d-row-actions">
              <ActionButton
                action={testWebhookAction.bind(null, slug, h.id)}
                label="Enviar teste"
              />
              <ConfirmButton
                action={removeIntegrationAction.bind(null, slug, h.id)}
                label="Remover"
                confirmLabel="Remover webhook"
              />
            </span>
          </div>
        ))}
        {hooks.length < MAX_WEBHOOKS && (
          <SimpleForm
            action={addWebhookAction.bind(null, slug)}
            submit="Adicionar webhook"
            pendingText="Adicionando…"
            submitClass="d-btn d-btn-primary"
          >
            <label className="d-field">
              <span>Nome</span>
              <input name="name" required placeholder="Zapier" maxLength={60} />
            </label>
            <label className="d-field">
              <span>Endereço (URL) do webhook</span>
              <input
                name="url"
                type="url"
                required
                placeholder="https://hooks.zapier.com/hooks/catch/…"
                autoComplete="off"
                spellCheck={false}
              />
              <small className="d-muted">
                O endereço é guardado criptografado e não aparece inteiro depois
                de salvo.
              </small>
            </label>
          </SimpleForm>
        )}
        <details className="d-details">
          <summary>Como é o envio</summary>
          <p className="d-muted">
            Um <code>POST</code> com este JSON. O cabeçalho{" "}
            <code>x-vitrine-signature</code> traz{" "}
            <code>sha256=HMAC(chave, timestamp + &quot;.&quot; + corpo)</code>,
            e <code>x-vitrine-timestamp</code> o momento do envio, para quem
            quiser conferir a autenticidade.
          </p>
          <pre className="d-code">
            {JSON.stringify(
              webhookPayload(SAMPLE_LEAD, { slug, name: "Seu site" }),
              null,
              2
            )}
          </pre>
        </details>
      </section>

      <section className="d-card">
        <h2>Entregas recentes</h2>
        <p className="d-muted">
          O que foi enviado a cada destino. Se um destino estiver fora do ar,
          tentamos de novo sozinhos (até 6 vezes em cerca de um dia). Depois
          disso, você pode reenviar.
        </p>
        {!deliveries.length ? (
          <p className="d-empty-inline">
            Nada enviado ainda. Aparece aqui assim que chegar um cadastro e
            houver um destino configurado.
          </p>
        ) : (
          <div className="d-table-wrap">
            <table className="d-table">
              <thead>
                <tr>
                  <th>Quando</th>
                  <th>Destino</th>
                  <th>Contato</th>
                  <th>Situação</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {deliveries.map((d) => {
                  const [label, cls] = STATUS[d.status];
                  return (
                    <tr key={d.id}>
                      <td className="d-muted">{timeAgo(d.created_at)}</td>
                      <td>
                        {d.integration}
                        <small>
                          {d.kind === "email" ? "e-mail" : "webhook"}
                        </small>
                      </td>
                      <td>
                        {d.lead}
                        <small>{d.form || "Formulário de contato"}</small>
                      </td>
                      <td>
                        <span className={`d-flag ${cls}`}>{label}</span>
                        {d.status !== "sent" && d.attempts > 0 && (
                          <small>
                            {d.attempts} tentativa{d.attempts > 1 ? "s" : ""}
                          </small>
                        )}
                        {d.last_error && d.status !== "sent" && (
                          <small>{d.last_error}</small>
                        )}
                      </td>
                      <td>
                        {d.status === "failed" && (
                          <form
                            action={retryDeliveryAction.bind(null, slug, d.id)}
                          >
                            <button className="d-btn d-btn-sm" type="submit">
                              Reenviar
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {isPlatformAdmin && (
        <section className="d-card">
          <h2>Limites de envio (só agência)</h2>
          <p className="d-muted">
            Protegem este site contra spam e robôs sem atrapalhar quem divide a
            mesma rede, como um evento ou um escritório. Se um formulário passar
            do limite por hora, os novos envios são recusados e o fato aparece
            na aba Atividade.
          </p>
          <SimpleForm
            action={saveLimitsAction.bind(null, slug)}
            submit="Salvar limites"
            pendingText="Salvando…"
            submitClass="d-btn d-btn-primary"
          >
            <label className="d-field">
              <span>Envios por IP em 10 minutos</span>
              <input
                name="ipPer10Min"
                type="number"
                min={1}
                max={100000}
                defaultValue={limits.ipPer10Min}
                required
              />
            </label>
            <label className="d-field">
              <span>Envios por IP em 24 horas</span>
              <input
                name="ipPerDay"
                type="number"
                min={1}
                max={100000}
                defaultValue={limits.ipPerDay}
                required
              />
            </label>
            <label className="d-field">
              <span>Envios por formulário em 1 hora</span>
              <input
                name="formPerHour"
                type="number"
                min={1}
                max={100000}
                defaultValue={limits.formPerHour}
                required
              />
            </label>
          </SimpleForm>
        </section>
      )}
    </>
  );
}
