"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { readOrigin } from "../../components/site/attribution";
import {
  fieldKey,
  formIssues,
  parseOptions,
  readForm,
  type FieldDef as SignupField,
} from "../../lib/signup";
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
  const shownAt = useRef(0);
  useEffect(() => {
    shownAt.current = Date.now();
  }, []);

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
          hp: String(form.get("website") ?? ""),
          elapsedMs: Date.now() - shownAt.current,
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
            <Trap />
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

/** Field people never see: programs fill every input they find. */
function Trap() {
  return (
    <div className="v-hp" aria-hidden="true">
      <label>
        Não preencha este campo
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  );
}

/** Only addresses of the site itself or https: no javascript: or data: links. */
function safeLink(url: string) {
  const u = String(url || "").trim();
  return /^\/(?!\/)/.test(u) || /^https:\/\//i.test(u) ? u : "";
}

const INPUT: Record<string, { type: string; auto: string }> = {
  name: { type: "text", auto: "name" },
  email: { type: "email", auto: "email" },
  phone: { type: "tel", auto: "tel" },
  whatsapp: { type: "tel", auto: "tel" },
  company: { type: "text", auto: "organization" },
  city: { type: "text", auto: "address-level2" },
  text: { type: "text", auto: "off" },
};

function SignupInput({ f, name }: { f: SignupField; name: string }) {
  if (f.kind === "longtext")
    return (
      <textarea name={name} rows={4} required={f.required} maxLength={2000} />
    );
  if (f.kind === "choice")
    return (
      <select name={name} required={f.required} defaultValue="">
        <option value="">Selecione</option>
        {parseOptions(f.options).map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  const i = INPUT[f.kind] ?? INPUT.text;
  return (
    <input
      name={name}
      type={i.type}
      autoComplete={i.auto}
      required={f.required}
      maxLength={f.kind === "email" ? 200 : 200}
    />
  );
}

/** Lead capture form with the fields the client chose. */
export function Signup(
  p: PropsOf<"Signup"> & {
    id?: string;
    puck?: { isEditing?: boolean; metadata?: Record<string, unknown> };
  }
) {
  const form = readForm(p as unknown as Record<string, unknown>);
  const issues = formIssues(form);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [error, setError] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const editing = !!p.puck?.isEditing;
  const site = String(p.puck?.metadata?.siteSlug ?? "");
  const page = String(p.puck?.metadata?.path ?? "/");
  const compact = p.layout === "compact";
  const shownAt = useRef(0);
  useEffect(() => {
    shownAt.current = Date.now();
  }, []);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (editing) return;
    const fd = new FormData(e.currentTarget);
    const values: Record<string, string> = {};
    form.fields.forEach((_, i) => {
      const v = fd.get(fieldKey(i));
      if (typeof v === "string") values[fieldKey(i)] = v;
    });
    setState("sending");
    try {
      const res = await fetch("/api/public/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          site,
          page,
          blockId: p.id,
          values,
          consent: fd.get("consent") === "on",
          hp: String(fd.get("website") ?? ""),
          elapsedMs: Date.now() - shownAt.current,
          origin: readOrigin(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Não foi possível enviar.");
      setWhatsapp(typeof data.whatsapp === "string" ? data.whatsapp : "");
      setState("sent");
      // Tells the tracking pixels (if the site has any) that a lead arrived.
      window.dispatchEvent(new Event("vitrine:lead"));
    } catch (err) {
      setError((err as Error).message);
      setState("error");
    }
  };

  const policy = safeLink(p.consentLink);
  const done =
    state === "sent" ? (
      <div className="v-form v-form-done" role="status">
        <p>{p.success}</p>
        {whatsapp && (
          <a
            className="v-btn v-btn-primary"
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
          >
            Continuar no WhatsApp
          </a>
        )}
      </div>
    ) : null;

  const formEl = (
    <form
      className={compact ? "v-form v-signup-form" : "v-form"}
      onSubmit={submit}
      noValidate={false}
    >
      <div className={compact ? "v-signup-fields" : "v-signup-stack"}>
        {form.fields.map((f, i) => (
          <label
            key={i}
            className={f.kind === "longtext" ? "v-field-wide" : undefined}
          >
            <span>
              {f.label}
              {f.required ? "" : " (opcional)"}
            </span>
            <SignupInput f={f} name={fieldKey(i)} />
          </label>
        ))}
      </div>
      {form.consentOn && (
        <label className="v-consent-check">
          <input type="checkbox" name="consent" required />
          <span>
            {form.consentText}
            {policy && (
              <>
                {" "}
                <a href={policy} target="_blank" rel="noopener noreferrer">
                  Política de privacidade
                </a>
              </>
            )}
          </span>
        </label>
      )}
      <Trap />
      <button
        type="submit"
        className="v-btn v-btn-primary"
        disabled={state === "sending"}
      >
        {state === "sending" ? "Enviando…" : p.button}
      </button>
      {editing && (
        <p className="v-form-note">O formulário funciona no site publicado.</p>
      )}
      {editing && issues.length > 0 && (
        <p className="v-form-note v-form-warn">Atenção: {issues.join(" ")}</p>
      )}
      {state === "error" && <p className="v-form-error">{error}</p>}
    </form>
  );

  if (compact)
    return (
      <Section
        tone={p.tone}
        className="v-signup v-signup-compact"
        id="cadastro"
      >
        <div className="v-wrap v-signup-wrap">
          {p.eyebrow && <p className="v-eyebrow v-accent-text">{p.eyebrow}</p>}
          <h2 className="v-h2">{p.title}</h2>
          {p.text && <p className="v-lead">{p.text}</p>}
          {done ?? formEl}
        </div>
      </Section>
    );

  return (
    <Section tone={p.tone} className="v-signup v-contact" id="cadastro">
      <div className="v-wrap v-contact-grid">
        <div className="v-contact-copy">
          {p.eyebrow && <p className="v-eyebrow v-accent-text">{p.eyebrow}</p>}
          <h2 className="v-h2">{p.title}</h2>
          {p.text && <p className="v-lead">{p.text}</p>}
        </div>
        {done ?? formEl}
      </div>
    </Section>
  );
}
