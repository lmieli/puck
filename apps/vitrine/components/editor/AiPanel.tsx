"use client";

import { createUsePuck, useGetPuck, type Data } from "@puckeditor/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { blocks } from "@/blocks/schema";

const usePuck = createUsePuck();

type Turn =
  | { role: "user"; text: string; target?: string }
  | {
      role: "assistant";
      text: string;
      actions: string[];
      status?: string;
      error?: string;
      done: boolean;
    };

const generalIdeas = [
  "Reescreva os títulos com mais impacto, no estilo de um lançamento da Apple",
  "Adicione uma seção de depoimentos antes do rodapé",
  "Deixe a página em tema escuro com destaque azul",
  "Crie uma seção que conte a história do produto com rolagem",
];

const blockIdeas = [
  "Reescreva este bloco de forma mais curta e marcante",
  "Troque a imagem deste bloco por uma mais minimalista",
  "Mude o fundo deste bloco para o tema invertido",
];

export function AiPanel({
  siteSlug,
  path,
  enabled,
  initialPrompt,
  initialCredits,
}: {
  siteSlug: string;
  path: string;
  enabled: boolean;
  initialPrompt?: string;
  initialCredits: number;
}) {
  const [credits, setCredits] = useState(initialCredits);
  const dispatch = usePuck((s) => s.dispatch);
  const selected = usePuck((s) => s.selectedItem);
  const getPuck = useGetPuck();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const autoSent = useRef(false);

  const selectedId =
    (selected?.props as { id?: string } | undefined)?.id ?? null;
  const selectedLabel = selected
    ? (blocks as Record<string, { label: string }>)[selected.type]?.label ??
      selected.type
    : null;

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [turns]);

  const updateLast = (
    fn: (
      t: Extract<Turn, { role: "assistant" }>
    ) => Extract<Turn, { role: "assistant" }>
  ) =>
    setTurns((all) => {
      const copy = [...all];
      const last = copy[copy.length - 1];
      if (last?.role === "assistant") copy[copy.length - 1] = fn(last);
      return copy;
    });

  const send = useCallback(
    async (text: string, mode: "edit" | "build" = "edit") => {
      const instruction = text.trim();
      if (!instruction || busy) return;
      const data = getPuck().appState.data as Data;
      const history = turns
        .filter(
          (t) =>
            t.role === "user" || (t.role === "assistant" && t.done && !t.error)
        )
        .map((t) => ({ role: t.role, text: t.text }))
        .slice(-8);
      setTurns((all) => [
        ...all,
        {
          role: "user",
          text: instruction,
          target: mode === "edit" ? selectedLabel ?? undefined : undefined,
        },
        {
          role: "assistant",
          text: "",
          actions: [],
          status: "Pensando…",
          done: false,
        },
      ]);
      setInput("");
      setBusy(true);
      const controller = new AbortController();
      abort.current = controller;

      try {
        const res = await fetch("/api/ai", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            slug: siteSlug,
            path,
            instruction,
            data,
            selectedId: mode === "edit" ? selectedId : null,
            history,
            mode,
          }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Não foi possível falar com a IA.");
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";
          for (const raw of events) {
            const line = raw.trim();
            if (!line.startsWith("data:")) continue;
            const e = JSON.parse(line.slice(5));
            if (e.type === "status")
              updateLast((t) => ({ ...t, status: e.message }));
            else if (e.type === "text")
              updateLast((t) => ({
                ...t,
                text: t.text + e.delta,
                status: undefined,
              }));
            else if (e.type === "action")
              updateLast((t) => ({ ...t, actions: [...t.actions, e.label] }));
            else if (e.type === "page")
              dispatch({
                type: "setData",
                data: e.data,
                recordHistory: false,
              } as never);
            else if (e.type === "credits") setCredits(e.balance);
            else if (e.type === "done") {
              if (e.actions.length)
                dispatch({
                  type: "setData",
                  data: e.data,
                  recordHistory: true,
                } as never);
              updateLast((t) => ({
                ...t,
                text: e.summary,
                status: undefined,
                done: true,
              }));
            } else if (e.type === "error")
              updateLast((t) => ({
                ...t,
                error: e.message,
                status: undefined,
                done: true,
              }));
          }
        }
      } catch (err) {
        const aborted = (err as Error).name === "AbortError";
        updateLast((t) => ({
          ...t,
          error: aborted ? "Interrompido." : (err as Error).message,
          status: undefined,
          done: true,
        }));
      } finally {
        setBusy(false);
        abort.current = null;
        updateLast((t) => ({ ...t, done: true, status: undefined }));
      }
    },
    [busy, dispatch, getPuck, path, selectedId, selectedLabel, siteSlug, turns]
  );

  useEffect(() => {
    if (initialPrompt && enabled && !autoSent.current) {
      autoSent.current = true;
      send(initialPrompt, "build");
    }
  }, [initialPrompt, enabled, send]);

  return (
    <div className="vx-ai">
      <div className="vx-ai-head">
        <div className="vx-ai-orb" aria-hidden />
        <div>
          <strong>Assistente</strong>
          <span>
            Descreva a mudança. A página muda ao vivo e tudo pode ser desfeito.
          </span>
        </div>
      </div>

      <div className="vx-ai-log" ref={listRef} aria-live="polite">
        {turns.length === 0 && (
          <div className="vx-ai-empty">
            {!enabled && (
              <p className="vx-ai-warning">
                A IA ainda não está ativa neste servidor. Peça ao administrador
                para definir <code>OPENROUTER_API_KEY</code>.
              </p>
            )}
            <p className="vx-ai-hint">
              {selectedLabel
                ? `Ideias para "${selectedLabel}":`
                : "Experimente:"}
            </p>
            {(selectedLabel ? blockIdeas : generalIdeas).map((idea) => (
              <button
                key={idea}
                type="button"
                className="vx-ai-idea"
                disabled={!enabled || busy}
                onClick={() => send(idea)}
              >
                {idea}
              </button>
            ))}
          </div>
        )}
        {turns.map((t, i) =>
          t.role === "user" ? (
            <div key={i} className="vx-msg vx-msg-user">
              {t.target && <span className="vx-msg-target">{t.target}</span>}
              {t.text}
            </div>
          ) : (
            <div key={i} className="vx-msg vx-msg-ai">
              {t.actions.length > 0 && (
                <ul className="vx-actions">
                  {t.actions.map((a, j) => (
                    <li key={j}>{a}</li>
                  ))}
                </ul>
              )}
              {t.status && (
                <p className="vx-status">
                  <span className="vx-dots" aria-hidden />
                  {t.status}
                </p>
              )}
              {t.text && <p>{t.text}</p>}
              {t.error && <p className="vx-error">{t.error}</p>}
            </div>
          )
        )}
      </div>

      <form
        className="vx-ai-input"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        {selectedLabel && (
          <span className="vx-target">
            Editando: <strong>{selectedLabel}</strong>
          </span>
        )}
        <textarea
          value={input}
          rows={3}
          disabled={!enabled || credits <= 0}
          placeholder={
            selectedLabel
              ? `O que mudar em "${selectedLabel}"?`
              : "Ex.: adicione uma seção com o produto girando em 3D"
          }
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
        />
        <div className="vx-ai-input-row">
          <span
            className={credits <= 0 ? "vx-credits is-empty" : "vx-credits"}
            title="Os créditos são gastos conforme os tokens usados pela IA"
          >
            {credits <= 0
              ? "Sem créditos de IA"
              : `${credits.toLocaleString("pt-BR")} créditos`}
          </span>
          {busy ? (
            <button
              type="button"
              className="vx-btn vx-btn-ghost"
              onClick={() => abort.current?.abort()}
            >
              Parar
            </button>
          ) : (
            <button
              type="submit"
              className="vx-btn vx-btn-accent"
              disabled={!enabled || credits <= 0 || !input.trim()}
            >
              Enviar
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
