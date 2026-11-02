import {
  connectNotionAction,
  refreshNotionAction,
  removeIntegrationAction,
  saveNotionAction,
  testNotionAction,
} from "@/app/actions";
import {
  ActionButton,
  ConfirmButton,
  SimpleForm,
} from "@/components/dash/forms";
import {
  ANSWER_PREFIX,
  FIXED_SOURCES,
  MAX_NOTION,
  scopeValue,
  TYPE_LABEL,
  type PropType,
} from "@/lib/notion";
import { answersFor, type NotionView, type SiteForm } from "@/lib/notion-admin";

const scopeLabel = (name: string) => name || "Formulário de contato";

function ScopeSelect({ forms, value }: { forms: SiteForm[]; value: string }) {
  return (
    <select name="scope" defaultValue={value}>
      <option value="all">Todos os formulários</option>
      {forms.map((f) => (
        <option key={f.value} value={f.value}>
          {scopeLabel(f.name)}
        </option>
      ))}
      {/* A form that no longer exists stays selectable so saving does not change the scope silently. */}
      {value !== "all" && !forms.some((f) => f.value === value) && (
        <option value={value}>{value}</option>
      )}
    </select>
  );
}

export function NotionPanel({
  slug,
  connections,
  forms,
}: {
  slug: string;
  connections: NotionView[];
  forms: SiteForm[];
}) {
  return (
    <section className="d-card">
      <h2>Notion</h2>
      <p className="d-muted">
        Cada cadastro novo vira uma linha em um banco de dados do seu Notion.
        Você escolhe o banco, qual formulário envia para ele e qual resposta vai
        em cada coluna. Dá para ter um banco por formulário. O contato fica
        sempre guardado na aba Contatos, mesmo que o Notion esteja fora do ar.
      </p>

      {connections.map((c) => {
        const answers = answersFor(forms, c.scope);
        // Keep an answer already chosen even if the form no longer lists it.
        for (const m of c.mapping)
          if (m.source.startsWith(ANSWER_PREFIX)) {
            const l = m.source.slice(ANSWER_PREFIX.length);
            if (!answers.includes(l)) answers.push(l);
          }
        return (
          <details
            key={c.id}
            className="d-notion"
            open={connections.length === 1}
          >
            <summary>
              <strong>{c.name}</strong>
              <span className="d-muted">
                {" "}
                · banco “{c.dbTitle}” ·{" "}
                {c.scope === null
                  ? "todos os formulários"
                  : scopeLabel(c.scope)}
              </span>
              <span
                className={`d-flag ${c.enabled ? "d-flag-ok" : "d-flag-warn"}`}
              >
                {c.enabled ? "Ativo" : "Pausado"}
              </span>
            </summary>
            <SimpleForm
              action={saveNotionAction.bind(null, slug, c.id)}
              submit="Salvar"
              pendingText="Salvando…"
              submitClass="d-btn d-btn-primary"
            >
              <div className="d-grid-2">
                <label className="d-field">
                  <span>Nome desta conexão</span>
                  <input
                    name="name"
                    defaultValue={c.name}
                    maxLength={60}
                    required
                  />
                </label>
                <label className="d-field">
                  <span>Qual formulário envia para este banco</span>
                  <ScopeSelect forms={forms} value={scopeValue(c.scope)} />
                </label>
              </div>
              <label className="d-check">
                <input
                  type="checkbox"
                  name="enabled"
                  defaultChecked={c.enabled}
                />
                Enviar os novos cadastros para este banco
              </label>

              <h3>O que vai em cada coluna</h3>
              <p className="d-muted d-small">
                Colunas do Notion à esquerda; à direita, a resposta que preenche
                cada uma. Deixe “Não preencher” para ignorar uma coluna. A
                coluna de título nunca fica vazia.
              </p>
              <div className="d-map">
                {c.columns.map((col) => {
                  const current =
                    c.mapping.find((m) => m.property === col.name)?.source ??
                    "";
                  return (
                    <label key={col.id} className="d-map-row">
                      <span>
                        <strong>{col.name}</strong>
                        <small className="d-muted">
                          {TYPE_LABEL[col.type as PropType] ?? col.type}
                        </small>
                      </span>
                      <select name={`map:${col.id}`} defaultValue={current}>
                        <option value="">Não preencher</option>
                        <optgroup label="Dados do contato">
                          {FIXED_SOURCES.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.label}
                            </option>
                          ))}
                        </optgroup>
                        {answers.length > 0 && (
                          <optgroup label="Perguntas do formulário">
                            {answers.map((l) => (
                              <option key={l} value={`${ANSWER_PREFIX}${l}`}>
                                {l}
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                    </label>
                  );
                })}
              </div>
            </SimpleForm>
            <div className="d-row-actions d-notion-actions">
              <ActionButton
                action={testNotionAction.bind(null, slug, c.id)}
                label="Enviar teste"
              />
              <ActionButton
                action={refreshNotionAction.bind(null, slug, c.id)}
                label="Atualizar colunas"
                pendingText="Lendo…"
              />
              <ConfirmButton
                action={removeIntegrationAction.bind(null, slug, c.id)}
                label="Remover"
                confirmLabel="Remover conexão"
              />
            </div>
            <p className="d-muted d-small">
              Token terminado em …{c.tokenHint}. Guardado criptografado; para
              trocá-lo, remova a conexão e conecte de novo.
            </p>
          </details>
        );
      })}

      {connections.length < MAX_NOTION && (
        <div className="d-card-foot">
          <h3>Conectar um banco do Notion</h3>
          <ol className="d-steps">
            <li>
              No Notion, abra <code>notion.so/my-integrations</code>, crie uma
              integração interna e copie o <strong>token</strong>.
            </li>
            <li>
              Abra o banco de dados, toque em <strong>•••</strong> →{" "}
              <strong>Conexões</strong> e adicione essa integração.
            </li>
            <li>Cole abaixo o token e o link do banco.</li>
          </ol>
          <SimpleForm
            action={connectNotionAction.bind(null, slug)}
            submit="Conectar e ler as colunas"
            pendingText="Conectando…"
            submitClass="d-btn d-btn-primary"
          >
            <label className="d-field">
              <span>Nome (opcional)</span>
              <input name="name" maxLength={60} placeholder="Leads do site" />
            </label>
            <label className="d-field">
              <span>Token da integração</span>
              <input
                name="token"
                type="password"
                required
                autoComplete="off"
                spellCheck={false}
                placeholder="ntn_…"
              />
              <small className="d-muted">
                Guardado criptografado e nunca mostrado de novo.
              </small>
            </label>
            <label className="d-field">
              <span>Link do banco de dados</span>
              <input
                name="database"
                required
                autoComplete="off"
                spellCheck={false}
                placeholder="https://www.notion.so/…"
              />
            </label>
            <label className="d-field">
              <span>Qual formulário envia para este banco</span>
              <ScopeSelect forms={forms} value="all" />
            </label>
          </SimpleForm>
        </div>
      )}
    </section>
  );
}
