"use client";

import { useState, type FormEvent } from "react";
import { readOrigin } from "../../components/site/attribution";
import { useReveal } from "../motion";
import { Buttons, Media, Section, type ButtonItem, type PropsOf } from "../ui";

export function Cta(p: PropsOf<"Cta">) {
  const ref = useReveal<HTMLDivElement>();
  const swatches = p.swatches as { name: string; color: string }[];
  const [pick, setPick] = useState(0);
  return (
    <Section tone={p.tone} className="v-cta" id="comprar">
      <div
        ref={ref}
        className={`v-wrap v-cta-grid ${p.image ? "has-image" : ""}`}
      >
        <div className="v-cta-copy" data-reveal>
          {p.eyebrow && <p className="v-eyebrow v-accent-text">{p.eyebrow}</p>}
          <h2 className="v-display-2">{p.title}</h2>
          {p.text && <p className="v-lead">{p.text}</p>}
          {p.price && (
            <p className="v-price">
              <strong>{p.price}</strong>
              {p.priceNote && <span>{p.priceNote}</span>}
            </p>
          )}
          {swatches.length > 0 && (
            <div className="v-swatches" role="radiogroup" aria-label="Cores">
              {swatches.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  role="radio"
                  aria-checked={pick === i}
                  aria-label={s.name}
                  className={pick === i ? "is-active" : undefined}
                  style={{ background: s.color }}
                  onClick={() => setPick(i)}
                />
              ))}
              <span className="v-swatch-name">{swatches[pick]?.name}</span>
            </div>
          )}
          <Buttons items={p.buttons as ButtonItem[]} />
        </div>
        {p.image && (
          <div className="v-cta-media" data-reveal>
            <Media src={p.image} alt={p.title} />
          </div>
        )}
      </div>
    </Section>
  );
}

export function Contact(
  p: PropsOf<"Contact"> & {
    puck?: { isEditing?: boolean; metadata?: Record<string, unknown> };
  }
) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [error, setError] = useState("");
  const editing = !!p.puck?.isEditing;
  const site = String(p.puck?.metadata?.siteSlug ?? "");
  const page = String(p.puck?.metadata?.path ?? "/");

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (editing) return;
    const form = new FormData(e.currentTarget);
    setState("sending");
    try {
      const res = await fetch("/api/public/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          site,
          page,
          ...Object.fromEntries(form),
          origin: readOrigin(),
        }),
      });
      if (!res.ok)
        throw new Error(
          (await res.json().catch(() => ({}))).error ||
            "Não foi possível enviar."
        );
      setState("sent");
      // Tells the tracking pixels (if the site has any) that a lead arrived.
      window.dispatchEvent(new Event("vitrine:lead"));
    } catch (err) {
      setError((err as Error).message);
      setState("error");
    }
  };

  return (
    <Section tone={p.tone} className="v-contact" id="contato">
      <div className="v-wrap v-contact-grid">
        <div className="v-contact-copy">
          {p.eyebrow && <p className="v-eyebrow v-accent-text">{p.eyebrow}</p>}
          <h2 className="v-h2">{p.title}</h2>
          {p.text && <p className="v-lead">{p.text}</p>}
          <dl className="v-contact-info">
            {p.email && (
              <div>
                <dt>E-mail</dt>
                <dd>{p.email}</dd>
              </div>
            )}
            {p.phone && (
              <div>
                <dt>Telefone</dt>
                <dd>{p.phone}</dd>
              </div>
            )}
            {p.address && (
              <div>
                <dt>Endereço</dt>
                <dd>{p.address}</dd>
              </div>
            )}
          </dl>
        </div>
        {state === "sent" ? (
          <div className="v-form v-form-done" role="status">
            <p>{p.success}</p>
          </div>
        ) : (
          <form className="v-form" onSubmit={submit}>
            <label>
              <span>Nome</span>
              <input name="name" required autoComplete="name" />
            </label>
            <label>
              <span>E-mail</span>
              <input name="email" type="email" required autoComplete="email" />
            </label>
            <label>
              <span>Telefone</span>
              <input name="phone" type="tel" autoComplete="tel" />
            </label>
            <label>
              <span>Mensagem</span>
              <textarea name="message" rows={4} />
            </label>
            <button
              type="submit"
              className="v-btn v-btn-primary"
              disabled={state === "sending"}
            >
              {state === "sending" ? "Enviando…" : p.button}
            </button>
            {editing && (
              <p className="v-form-note">
                O formulário funciona no site publicado.
              </p>
            )}
            {state === "error" && <p className="v-form-error">{error}</p>}
          </form>
        )}
      </div>
    </Section>
  );
}
