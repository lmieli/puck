import { saveHeadScriptAction, saveTrackingAction } from "@/app/actions";
import { SimpleForm } from "@/components/dash/forms";
import { ID_RULES, type Tracking } from "@/lib/tracking";

const FIELDS: {
  name: keyof typeof ID_RULES;
  label: string;
  help: string;
}[] = [
  {
    name: "metaPixel",
    label: "Meta Pixel (Facebook e Instagram)",
    help: "Gerenciador de Eventos do Meta → Fontes de dados → ID do pixel. Só números.",
  },
  {
    name: "ga4",
    label: "Google Analytics 4",
    help: "Google Analytics → Administrador → Fluxos de dados → ID da métrica. Começa com G-.",
  },
  {
    name: "googleAds",
    label: "Google Ads",
    help: "Google Ads → Metas → Conversões → Tag do Google. Começa com AW-.",
  },
  {
    name: "googleAdsLeadLabel",
    label: "Rótulo da conversão do Google Ads (opcional)",
    help: "Na conversão criada no Google Ads, é o trecho depois da barra em AW-123456789/rótulo. Faz o envio do formulário contar como conversão.",
  },
  {
    name: "tiktok",
    label: "TikTok Pixel",
    help: "TikTok Ads → Eventos → Gerenciar → ID do pixel.",
  },
  {
    name: "pinterest",
    label: "Pinterest Tag",
    help: "Pinterest Ads → Conversões → ID da tag. Só números.",
  },
  {
    name: "googleVerification",
    label: "Verificação do Google Search Console (opcional)",
    help: 'Search Console → Verificar propriedade → Tag HTML. Copie só o valor de content="…".',
  },
  {
    name: "metaVerification",
    label: "Verificação de domínio do Meta (opcional)",
    help: 'Meta Business → Segurança da marca → Domínios → Meta tag. Copie só o valor de content="…".',
  },
];

export function TrackingPanel({
  slug,
  tracking,
  headScript,
  isPlatformAdmin,
}: {
  slug: string;
  tracking: Tracking;
  headScript: string;
  isPlatformAdmin: boolean;
}) {
  return (
    <>
      <section className="d-card">
        <h2>Rastreamento</h2>
        <p className="d-muted">
          Cole só o <strong>ID</strong> de cada ferramenta. O código oficial já
          está pronto no sistema: você não cola script nenhum. O que ficar em
          branco fica desligado.
        </p>
        <SimpleForm
          action={saveTrackingAction.bind(null, slug)}
          submit="Salvar"
          pendingText="Salvando…"
          submitClass="d-btn d-btn-primary"
        >
          {FIELDS.map((f) => (
            <label key={f.name} className="d-field">
              <span>{f.label}</span>
              <input
                name={f.name}
                defaultValue={tracking[f.name]}
                placeholder={ID_RULES[f.name].example}
                autoComplete="off"
                spellCheck={false}
              />
              <small className="d-muted">{f.help}</small>
            </label>
          ))}
          <label className="d-check">
            <input
              type="checkbox"
              name="consent"
              defaultChecked={tracking.consent}
            />
            Pedir consentimento de cookies antes de ativar as ferramentas acima
            (recomendado pela LGPD)
          </label>
          <label className="d-check">
            <input
              type="checkbox"
              name="views"
              defaultChecked={tracking.views}
            />
            Contar visitas no painel (sem cookies e sem dados pessoais)
          </label>
        </SimpleForm>
        <p className="d-muted">
          O formulário de contato avisa Meta, Google, TikTok e Pinterest quando
          alguém envia uma mensagem, e os botões principais registram cliques.
          Cada contato também guarda de qual campanha ou site a pessoa veio.
        </p>
      </section>

      {isPlatformAdmin ? (
        <section className="d-card">
          <h2>Código próprio (só agência)</h2>
          <p className="d-muted">
            Para o que não tem campo acima, como Google Tag Manager, chat ou
            outras ferramentas. O código entra no <code>&lt;head&gt;</code> de
            todas as páginas deste site, depois do aceite de cookies. Ele roda
            com o mesmo poder do site: cole só código de fontes em que você
            confia.
          </p>
          <SimpleForm
            action={saveHeadScriptAction.bind(null, slug)}
            submit="Salvar código"
            pendingText="Salvando…"
            submitClass="d-btn d-btn-primary"
          >
            <label className="d-field">
              <span>HTML do &lt;head&gt;</span>
              <textarea
                name="headScript"
                rows={8}
                defaultValue={headScript}
                spellCheck={false}
                placeholder="<script>…</script>"
              />
            </label>
          </SimpleForm>
        </section>
      ) : (
        headScript.trim() && (
          <section className="d-card">
            <h2>Código próprio</h2>
            <p className="d-muted">
              A agência configurou um código próprio para este site. Para
              alterá-lo, fale com ela.
            </p>
          </section>
        )
      )}
    </>
  );
}
