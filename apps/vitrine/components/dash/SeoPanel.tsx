import { saveSeoAction } from "@/app/actions";
import { SimpleForm } from "@/components/dash/forms";
import {
  AI_SEARCH_BOTS,
  AI_TRAINING_BOTS,
  BUSINESS_TYPES,
  type Audit,
  type Seo,
} from "@/lib/seo";

type PageAudit = { path: string; title: string; audit: Audit };

const levelLabel = {
  error: "Corrigir",
  warn: "Melhorar",
  info: "Dica",
} as const;

export function SeoPanel({
  slug,
  seo,
  origin,
  audits,
  isPlatformAdmin,
}: {
  slug: string;
  seo: Seo;
  origin: string;
  audits: PageAudit[];
  isPlatformAdmin: boolean;
}) {
  return (
    <>
      <section className="d-card">
        <h2>Como o site aparece no Google e nas IAs</h2>
        <p className="d-muted">
          A Vitrine entrega sozinha o que buscadores e agentes de IA (ChatGPT,
          Claude, Perplexity) procuram. O endereço principal deste site é{" "}
          <code>{origin}</code>.
        </p>
        <ul className="d-seo-files">
          {[
            ["/sitemap.xml", "mapa das páginas para o Google"],
            ["/robots.txt", "regras para buscadores e agentes de IA"],
            ["/llms.txt", "resumo e lista de páginas para IAs"],
            ["/llms-full.txt", "todo o texto do site em um arquivo para IAs"],
            [
              "/index.md",
              "cada página também existe em Markdown (acrescente .md)",
            ],
          ].map(([p, d]) => (
            <li key={p}>
              <a href={`${origin}${p}`} target="_blank" rel="noreferrer">
                <code>{p}</code>
              </a>{" "}
              <span className="d-muted">{d}</span>
            </li>
          ))}
        </ul>
        {!isPlatformAdmin && (
          <p className="d-muted d-small">
            Em sites com domínio próprio, só o domínio próprio é indexado. O
            endereço provisório fica fora do Google para não competir com ele.
          </p>
        )}
      </section>

      <section className="d-card">
        <h2>Ajustes</h2>
        <SimpleForm
          action={saveSeoAction.bind(null, slug)}
          submit="Salvar"
          pendingText="Salvando…"
          submitClass="d-btn d-btn-primary"
        >
          <h3>Quem é a empresa</h3>
          <p className="d-muted d-small">
            Vira dados estruturados (schema.org) em todas as páginas. É assim
            que o Google e as IAs sabem o nome, o telefone e o endereço certos.
          </p>
          <label className="d-field">
            <span>Nome da empresa</span>
            <input name="businessName" defaultValue={seo.businessName} />
          </label>
          <label className="d-field">
            <span>Tipo de negócio</span>
            <select name="businessType" defaultValue={seo.businessType}>
              {BUSINESS_TYPES.map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="d-field">
            <span>Sobre a empresa (para pessoas e para IAs)</span>
            <textarea
              name="about"
              rows={3}
              maxLength={600}
              defaultValue={seo.about}
            />
            <small className="d-muted">
              2 a 3 frases: o que faz, para quem, onde atende. As IAs usam este
              texto para responder perguntas sobre a empresa.
            </small>
          </label>
          <div className="d-grid-2">
            <label className="d-field">
              <span>Telefone</span>
              <input name="phone" defaultValue={seo.phone} />
            </label>
            <label className="d-field">
              <span>E-mail</span>
              <input name="email" type="email" defaultValue={seo.email} />
            </label>
            <label className="d-field">
              <span>Rua e número</span>
              <input name="street" defaultValue={seo.street} />
            </label>
            <label className="d-field">
              <span>Cidade</span>
              <input name="city" defaultValue={seo.city} />
            </label>
            <label className="d-field">
              <span>Estado</span>
              <input name="region" defaultValue={seo.region} />
            </label>
            <label className="d-field">
              <span>CEP</span>
              <input name="postalCode" defaultValue={seo.postalCode} />
            </label>
          </div>
          <label className="d-field">
            <span>Região atendida</span>
            <input
              name="areaServed"
              defaultValue={seo.areaServed}
              placeholder="Ex.: Grande São Paulo"
            />
          </label>
          <label className="d-field">
            <span>Endereço do logo (https://…)</span>
            <input name="logo" defaultValue={seo.logo} />
          </label>
          <label className="d-field">
            <span>Perfis em outros sites (um por linha)</span>
            <textarea
              name="sameAs"
              rows={3}
              defaultValue={seo.sameAs.join("\n")}
              placeholder={
                "https://www.instagram.com/empresa\nhttps://www.linkedin.com/company/empresa"
              }
            />
            <small className="d-muted">
              Instagram, LinkedIn, Google Meu Negócio… Ajuda o Google e as IAs a
              reconhecer que são a mesma empresa.
            </small>
          </label>

          <h3>Quem pode ler o site</h3>
          <label className="d-check">
            <input
              type="checkbox"
              name="indexable"
              defaultChecked={seo.indexable}
            />
            Aparecer no Google e em outros buscadores
          </label>
          <small className="d-muted">
            Desligue enquanto o site está em construção. Nada é indexado e as
            IAs também ficam de fora.
          </small>
          <label className="d-check">
            <input
              type="checkbox"
              name="aiSearch"
              defaultChecked={seo.aiSearch}
            />
            Aparecer em respostas e buscas de IA (ChatGPT, Claude, Perplexity)
          </label>
          <small className="d-muted">
            Recomendado. É assim que a empresa é citada quando alguém pergunta a
            uma IA. Libera: {AI_SEARCH_BOTS.map((b) => b.agent).join(", ")}.
          </small>
          <label className="d-check">
            <input
              type="checkbox"
              name="aiTraining"
              defaultChecked={seo.aiTraining}
            />
            Permitir uso para treinar modelos de IA
          </label>
          <small className="d-muted">
            Desligar não tira o site das respostas de IA. Bloqueia:{" "}
            {AI_TRAINING_BOTS.map((b) => b.agent).join(", ")}.
          </small>
        </SimpleForm>
      </section>

      <section className="d-card">
        <h2>Revisão página por página</h2>
        <p className="d-muted">
          Olha só o que está publicado. Cada item diz o que mudar no editor
          (ajustes da página, ao clicar fora de qualquer bloco).
        </p>
        {audits.map((a) => (
          <div key={a.path} className="d-seo-page">
            <div className="d-seo-head">
              <strong>
                {a.title || (a.path === "/" ? "Página inicial" : a.path)}
              </strong>
              <code>{a.path}</code>
              <span
                className={`d-flag ${
                  a.audit.score >= 85
                    ? "d-flag-ok"
                    : a.audit.score >= 60
                    ? "d-flag-info"
                    : "d-flag-warn"
                }`}
              >
                {a.audit.score}/100
              </span>
            </div>
            {a.audit.findings.length === 0 ? (
              <p className="d-muted">Tudo certo.</p>
            ) : (
              <ul className="d-seo-findings">
                {a.audit.findings.map((f, i) => (
                  <li key={i} className={`is-${f.level}`}>
                    <b>{levelLabel[f.level]}</b> {f.text}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
        {audits.length === 0 && (
          <p className="d-muted">Nenhuma página publicada ainda.</p>
        )}
      </section>
    </>
  );
}
