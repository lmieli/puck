import { saveWhatsAppAction } from "@/app/actions";
import { SimpleForm } from "@/components/dash/forms";
import { WhatsAppBubble } from "@/components/site/WhatsAppBubble";
import {
  DAY_NAMES,
  formatNumber,
  MAX_LABEL,
  MAX_MESSAGE,
  openNow,
  TIMEZONES,
  type WhatsApp,
} from "@/lib/whatsapp";

/** Monday first, the way the week reads in Brazil. Indexes follow Date (0 = Sunday). */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function WhatsAppPanel({
  slug,
  whatsapp,
  pages,
}: {
  slug: string;
  whatsapp: WhatsApp;
  /** The site's pages, for the "where it appears" list. */
  pages: { path: string; title: string }[];
}) {
  const { schedule, visibility } = whatsapp;
  const open = openNow(whatsapp, new Date());
  // Keep saved paths whose page no longer exists, so saving does not drop them silently.
  const known = new Set(pages.map((p) => p.path));
  const listed = [
    ...pages,
    ...visibility.paths
      .filter((p) => !known.has(p))
      .map((p) => ({ path: p, title: "" })),
  ];
  return (
    <section className="d-card">
      <h2>Balão de WhatsApp</h2>
      <p className="d-muted">
        Um botão verde fixo no canto de todas as páginas. Quem toca abre uma
        conversa com o número abaixo, já com a mensagem pronta. Deixe o número
        em branco para desligar.
      </p>
      <SimpleForm
        action={saveWhatsAppAction.bind(null, slug)}
        submit="Salvar"
        pendingText="Salvando…"
        submitClass="d-btn d-btn-primary"
      >
        <label className="d-field">
          <span>Número do WhatsApp</span>
          <input
            name="number"
            type="tel"
            inputMode="tel"
            defaultValue={whatsapp.number ? formatNumber(whatsapp.number) : ""}
            placeholder="(11) 91234-5678"
            autoComplete="off"
          />
          <small className="d-muted">
            Com o DDD. Fora do Brasil, comece com + e o código do país.
          </small>
        </label>
        <label className="d-field">
          <span>Mensagem de abertura (opcional)</span>
          <textarea
            name="message"
            rows={3}
            maxLength={MAX_MESSAGE}
            defaultValue={whatsapp.message}
            placeholder="Olá! Vi o site e gostaria de saber mais."
          />
          <small className="d-muted">
            A conversa já abre com este texto; a pessoa só precisa enviar.
          </small>
        </label>
        <label className="d-field">
          <span>Texto ao lado do ícone (opcional)</span>
          <input
            name="label"
            maxLength={MAX_LABEL}
            defaultValue={whatsapp.label}
            placeholder="Fale conosco"
          />
          <small className="d-muted">
            Aparece em telas grandes. No celular fica só o ícone.
          </small>
        </label>
        <div className="d-field">
          <span>Posição</span>
          <div className="d-radio-row" role="radiogroup" aria-label="Posição">
            <label className="d-check">
              <input
                type="radio"
                name="position"
                value="right"
                defaultChecked={whatsapp.position === "right"}
              />
              Canto direito
            </label>
            <label className="d-check">
              <input
                type="radio"
                name="position"
                value="left"
                defaultChecked={whatsapp.position === "left"}
              />
              Canto esquerdo
            </label>
          </div>
        </div>

        <h3 className="d-subhead">Onde aparece</h3>
        <div
          className="d-radio-col"
          role="radiogroup"
          aria-label="Onde aparece"
        >
          {(
            [
              ["all", "Em todas as páginas"],
              ["only", "Só nas páginas marcadas"],
              ["except", "Em todas, menos nas marcadas"],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="d-check">
              <input
                type="radio"
                name="visibilityMode"
                value={value}
                defaultChecked={visibility.mode === value}
              />
              {label}
            </label>
          ))}
        </div>
        <div className="d-pages-pick">
          {listed.map((p) => (
            <label key={p.path} className="d-check">
              <input
                type="checkbox"
                name="paths"
                value={p.path}
                defaultChecked={visibility.paths.includes(p.path)}
              />
              <code>{p.path}</code>
              {p.title && <span className="d-muted"> {p.title}</span>}
              {!known.has(p.path) && (
                <span className="d-muted"> (página removida)</span>
              )}
            </label>
          ))}
        </div>
        <small className="d-muted">
          A lista só vale nas opções &quot;Só nas marcadas&quot; e &quot;Todas,
          menos as marcadas&quot;. Útil para esconder o balão, por exemplo, na
          página de agradecimento.
        </small>

        <h3 className="d-subhead">Horário de atendimento</h3>
        <label className="d-check">
          <input
            type="checkbox"
            name="hoursEnabled"
            defaultChecked={schedule.enabled}
          />
          Mostrar o balão só no horário de atendimento
        </label>
        <label className="d-field">
          <span>Fuso horário do negócio</span>
          <select name="timezone" defaultValue={schedule.timezone}>
            {TIMEZONES.map(([zone, label]) => (
              <option key={zone} value={zone}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <div className="d-hours">
          {WEEK_ORDER.map((i) => {
            const d = schedule.days[i];
            return (
              <div key={i} className="d-hours-row">
                <label className="d-check">
                  <input
                    type="checkbox"
                    name={`day${i}_on`}
                    defaultChecked={!!d}
                  />
                  {DAY_NAMES[i]}
                </label>
                <input
                  type="time"
                  name={`day${i}_open`}
                  defaultValue={d?.open ?? "09:00"}
                  aria-label={`${DAY_NAMES[i]}: abre às`}
                />
                <span className="d-muted">até</span>
                <input
                  type="time"
                  name={`day${i}_close`}
                  defaultValue={d?.close ?? "18:00"}
                  aria-label={`${DAY_NAMES[i]}: fecha às`}
                />
              </div>
            );
          })}
        </div>
        <small className="d-muted">
          Dia sem marcar = sem atendimento. Para atender de madrugada, use o
          fechamento antes da abertura (por exemplo, 22:00 até 02:00).
        </small>
        <div
          className="d-radio-col"
          role="radiogroup"
          aria-label="Fora do horário"
        >
          <label className="d-check">
            <input
              type="radio"
              name="outside"
              value="hide"
              defaultChecked={schedule.outside === "hide"}
            />
            Fora do horário, esconder o balão
          </label>
          <label className="d-check">
            <input
              type="radio"
              name="outside"
              value="message"
              defaultChecked={schedule.outside === "message"}
            />
            Fora do horário, manter o balão com outra mensagem
          </label>
        </div>
        <label className="d-field">
          <span>Mensagem fora do horário (opcional)</span>
          <textarea
            name="outsideMessage"
            rows={2}
            maxLength={MAX_MESSAGE}
            defaultValue={schedule.outsideMessage}
            placeholder="Olá! Estamos fora do horário, mas deixe sua mensagem que respondemos assim que abrirmos."
          />
        </label>
        <label className="d-field">
          <span>Texto ao lado do ícone fora do horário (opcional)</span>
          <input
            name="outsideLabel"
            maxLength={MAX_LABEL}
            defaultValue={schedule.outsideLabel}
            placeholder="Deixe sua mensagem"
          />
        </label>
      </SimpleForm>
      {schedule.enabled && whatsapp.number && (
        <p className={`d-flag ${open ? "d-flag-ok" : "d-flag-warn"}`}>
          Agora é {open ? "horário de atendimento" : "fora do horário"} (
          {TIMEZONES.find(([z]) => z === schedule.timezone)?.[1]}).
        </p>
      )}
      {whatsapp.number && (
        <div className="d-wa-preview">
          <span className="d-muted">Como aparece no site</span>
          <WhatsAppBubble whatsapp={whatsapp} preview />
        </div>
      )}
      <p className="d-muted">
        Os cliques no balão são contados como contato nas ferramentas da aba
        Rastreamento (Contact no Meta e no TikTok, whatsapp_click no Google).
      </p>
    </section>
  );
}
