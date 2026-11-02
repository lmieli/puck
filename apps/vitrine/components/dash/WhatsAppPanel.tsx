import { saveWhatsAppAction } from "@/app/actions";
import { SimpleForm } from "@/components/dash/forms";
import { WhatsAppBubble } from "@/components/site/WhatsAppBubble";
import {
  formatNumber,
  MAX_LABEL,
  MAX_MESSAGE,
  type WhatsApp,
} from "@/lib/whatsapp";

export function WhatsAppPanel({
  slug,
  whatsapp,
}: {
  slug: string;
  whatsapp: WhatsApp;
}) {
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
      </SimpleForm>
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
