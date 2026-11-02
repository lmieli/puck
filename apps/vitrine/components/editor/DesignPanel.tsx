"use client";

import { createUsePuck } from "@puckeditor/core";
import { useState } from "react";
import { presets, styleKeys } from "@/blocks/design";

const usePuck = createUsePuck();

export function DesignPanel({
  siteSlug,
  path,
  canApplyAll,
}: {
  siteSlug: string;
  path: string;
  canApplyAll: boolean;
}) {
  const dispatch = usePuck((s) => s.dispatch);
  const rootProps = usePuck((s) => s.appState.data.root.props) as
    | Record<string, unknown>
    | undefined;
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const apply = (props: Record<string, unknown>, name: string) => {
    dispatch({
      type: "setData",
      recordHistory: true,
      data: (prev: { root?: { props?: Record<string, unknown> } }) => ({
        root: {
          ...(prev.root ?? {}),
          props: { ...(prev.root?.props ?? {}), ...props },
        },
      }),
    } as never);
    setMessage(`Estilo "${name}" aplicado a esta página. Dá para desfazer.`);
  };

  const applyAll = async () => {
    setBusy(true);
    setMessage("");
    const props: Record<string, unknown> = {};
    for (const k of styleKeys)
      if (rootProps && k in rootProps) props[k] = rootProps[k];
    try {
      const res = await fetch(`/api/sites/${siteSlug}/style`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ props, path }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Não foi possível aplicar.");
      setMessage(
        json.pages
          ? `Estilo copiado para o rascunho de ${json.pages} outra(s) página(s). Publique cada uma para ir ao ar.`
          : "Este site só tem esta página."
      );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="vx-design">
      <div className="vx-panel-head">
        <strong>Estilo do site</strong>
        <span>
          Escolha um ponto de partida. Depois ajuste cada detalhe em
          &quot;Página&quot; (nada selecionado) ou em &quot;Estilo e
          espaçamento&quot; de cada bloco.
        </span>
      </div>
      <ul className="vx-presets">
        {presets.map((pr) => (
          <li key={pr.id}>
            <button
              type="button"
              onClick={() => apply(pr.props, pr.name)}
              className="vx-preset"
            >
              <span className="vx-swatch" aria-hidden>
                {pr.swatch.map((c) => (
                  <i key={c} style={{ background: c }} />
                ))}
              </span>
              <strong>{pr.name}</strong>
              <small>{pr.description}</small>
            </button>
          </li>
        ))}
      </ul>
      {canApplyAll && (
        <div className="vx-apply-all">
          <button
            type="button"
            className="vx-btn"
            disabled={busy}
            onClick={applyAll}
          >
            {busy ? "Aplicando…" : "Usar este estilo em todas as páginas"}
          </button>
          <span>
            Copia tema, cores, fontes e formato desta página para o rascunho das
            outras.
          </span>
        </div>
      )}
      {message && (
        <p className="vx-note" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
