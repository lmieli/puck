"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/app/actions";

type Action = (state: FormState, form: FormData) => Promise<FormState>;

function Submit({
  children,
  pendingText,
  className = "d-btn d-btn-primary",
}: {
  children: React.ReactNode;
  pendingText: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? pendingText : children}
    </button>
  );
}

function Feedback({ state }: { state: FormState }) {
  if (!state) return null;
  if (state.error)
    return (
      <p className="d-feedback d-feedback-error" role="alert">
        {state.error}
      </p>
    );
  if (state.ok && state.link)
    return (
      <div className="d-feedback d-feedback-ok" role="status">
        <p>{state.ok}</p>
        <CopyText text={state.link} />
      </div>
    );
  if (state.ok)
    return (
      <p className="d-feedback d-feedback-ok" role="status">
        {state.ok}
      </p>
    );
  return null;
}

export function LoginForm({ action }: { action: Action }) {
  const [state, run] = useActionState(action, undefined);
  return (
    <form action={run} className="d-form">
      <label className="d-field">
        <span>E-mail</span>
        <input
          id="login-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue="admin@vitrine.app"
        />
      </label>
      <label className="d-field">
        <span>Senha</span>
        <input
          id="login-password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
      </label>
      <Feedback state={state} />
      <Submit
        pendingText="Entrando…"
        className="d-btn d-btn-primary d-btn-block"
      >
        Entrar
      </Submit>
    </form>
  );
}

export function NewSiteForm({
  action,
  templates,
}: {
  action: Action;
  templates: {
    id: string;
    name: string;
    description: string;
    preview: string;
  }[];
}) {
  const [state, run] = useActionState(action, undefined);
  const [mode, setMode] = useState<"ai" | "template">("ai");
  const [template, setTemplate] = useState(templates[0]?.id ?? "blank");
  return (
    <form action={run} className="d-form d-new-site">
      <label className="d-field">
        <span>Nome do cliente ou do site</span>
        <input
          id="site-name"
          name="name"
          required
          placeholder="Ex.: Aurora Fones"
        />
      </label>

      <div className="d-segment" role="radiogroup" aria-label="Como começar">
        <label className={mode === "ai" ? "is-active" : ""}>
          <input
            type="radio"
            name="mode"
            value="ai"
            checked={mode === "ai"}
            onChange={() => setMode("ai")}
          />
          <strong>Criar com IA</strong>
          <span>
            Descreva o negócio e a IA monta o site inteiro, ao vivo, no editor.
          </span>
        </label>
        <label className={mode === "template" ? "is-active" : ""}>
          <input
            type="radio"
            name="mode"
            value="template"
            checked={mode === "template"}
            onChange={() => setMode("template")}
          />
          <strong>Começar de um modelo</strong>
          <span>Escolha um ponto de partida pronto e ajuste depois.</span>
        </label>
      </div>

      {mode === "ai" ? (
        <label className="d-field">
          <span>Sobre o negócio</span>
          <textarea
            id="site-brief"
            name="brief"
            rows={5}
            placeholder="Ex.: Marca brasileira de fones sem fio premium. Público jovem urbano. Produto principal: Aurora One, cancelamento de ruído e 40h de bateria. Tom: minimalista, confiante. Quero um site de lançamento com o produto em 3D."
          />
        </label>
      ) : (
        <div className="d-templates" role="radiogroup" aria-label="Modelo">
          {templates.map((t) => (
            <label
              key={t.id}
              className={`d-template ${template === t.id ? "is-active" : ""}`}
            >
              <input
                type="radio"
                name="template"
                value={t.id}
                checked={template === t.id}
                onChange={() => setTemplate(t.id)}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.preview.replace("w=2000", "w=600")} alt="" />
              <strong>{t.name}</strong>
              <span>{t.description}</span>
            </label>
          ))}
        </div>
      )}
      <Feedback state={state} />
      <Submit pendingText="Criando…">
        {mode === "ai" ? "Criar e abrir o editor" : "Criar site"}
      </Submit>
    </form>
  );
}

export function InlineForm({
  action,
  children,
  submit,
  pendingText,
}: {
  action: Action;
  children: React.ReactNode;
  submit: string;
  pendingText: string;
}) {
  const [state, run] = useActionState(action, undefined);
  return (
    <form action={run} className="d-inline-form">
      <div className="d-inline-fields">
        {children}
        <Submit pendingText={pendingText} className="d-btn">
          {submit}
        </Submit>
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function ConfirmButton({
  action,
  label,
  confirmLabel = "Confirmar",
  className = "d-btn d-btn-ghost d-btn-sm",
}: {
  action: () => Promise<void>;
  label: string;
  confirmLabel?: string;
  className?: string;
}) {
  const [asking, setAsking] = useState(false);
  if (!asking) {
    return (
      <button
        type="button"
        className={className}
        onClick={() => setAsking(true)}
      >
        {label}
      </button>
    );
  }
  return (
    <span className="d-confirm">
      <form action={action}>
        <Submit pendingText="…" className="d-btn d-btn-danger d-btn-sm">
          {confirmLabel}
        </Submit>
      </form>
      <button
        type="button"
        className="d-btn d-btn-ghost d-btn-sm"
        onClick={() => setAsking(false)}
      >
        Cancelar
      </button>
    </span>
  );
}

export function CopyText({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="d-copy"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {}
      }}
    >
      <code>{text}</code>
      <span>{done ? "Copiado" : "Copiar"}</span>
    </button>
  );
}

export function SimpleForm({
  action,
  children,
  submit,
  pendingText,
  className = "d-form",
  submitClass = "d-btn d-btn-primary d-btn-block",
}: {
  action: Action;
  children?: React.ReactNode;
  submit: string;
  pendingText: string;
  className?: string;
  submitClass?: string;
}) {
  const [state, run] = useActionState(action, undefined);
  return (
    <form action={run} className={className}>
      {children}
      <Feedback state={state} />
      <Submit pendingText={pendingText} className={submitClass}>
        {submit}
      </Submit>
    </form>
  );
}

/** A button that runs a server action and shows what it answered ("Enviar teste"). */
export function ActionButton({
  action,
  label,
  pendingText = "Enviando…",
}: {
  action: () => Promise<FormState>;
  label: string;
  pendingText?: string;
}) {
  const [state, run, pending] = useActionState(
    async () => action(),
    undefined as FormState
  );
  return (
    <span className="d-action-result">
      <form action={run}>
        <button className="d-btn d-btn-sm" type="submit" disabled={pending}>
          {pending ? pendingText : label}
        </button>
      </form>
      <Feedback state={state} />
    </span>
  );
}
