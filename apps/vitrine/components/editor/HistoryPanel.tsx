"use client";

import { createUsePuck } from "@puckeditor/core";
import { useCallback, useEffect, useState } from "react";
import { timeAgo } from "@/lib/time";

const usePuck = createUsePuck();

type Version = {
  id: number;
  number: number;
  note: string;
  source: string;
  created_at: string;
  author: string | null;
};

const sourceLabel: Record<string, string> = {
  ai: "IA",
  restore: "Restauração",
  template: "Modelo",
  manual: "",
};

export function HistoryPanel({
  siteSlug,
  path,
  canRestore,
  refreshKey,
  onRestored,
}: {
  siteSlug: string;
  path: string;
  canRestore: boolean;
  refreshKey: number;
  onRestored: (number: number) => void;
}) {
  const dispatch = usePuck((s) => s.dispatch);
  const [versions, setVersions] = useState<Version[] | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(
      `/api/sites/${siteSlug}/versions?path=${encodeURIComponent(path)}`
    );
    const json = await res.json();
    setVersions(res.ok ? json.versions : []);
  }, [siteSlug, path]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const open = async (v: Version) => {
    setBusy(v.id);
    const res = await fetch(`/api/sites/${siteSlug}/versions/${v.id}`);
    const json = await res.json();
    setBusy(null);
    if (!res.ok) return setMessage(json.error);
    dispatch({
      type: "setData",
      data: json.data,
      recordHistory: true,
    } as never);
    setMessage(
      `Versão ${v.number} aberta no editor. Publique para colocá-la no ar.`
    );
  };

  const restore = async (v: Version) => {
    setBusy(v.id);
    const res = await fetch(`/api/sites/${siteSlug}/versions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: v.id }),
    });
    const json = await res.json();
    if (!res.ok) {
      setBusy(null);
      return setMessage(json.error);
    }
    const data = await (
      await fetch(`/api/sites/${siteSlug}/versions/${v.id}`)
    ).json();
    dispatch({
      type: "setData",
      data: data.data,
      recordHistory: true,
    } as never);
    setBusy(null);
    setMessage(
      `Versão ${v.number} restaurada e publicada como versão ${json.number}.`
    );
    onRestored(json.number);
    load();
  };

  return (
    <div className="vx-history">
      <div className="vx-panel-head">
        <strong>Versões publicadas</strong>
        <span>
          Cada publicação vira uma versão. Restaurar publica de novo, sem apagar
          nada.
        </span>
      </div>
      {message && (
        <p className="vx-note" role="status">
          {message}
        </p>
      )}
      {versions === null ? (
        <p className="vx-muted">Carregando…</p>
      ) : versions.length === 0 ? (
        <p className="vx-muted">Esta página ainda não foi publicada.</p>
      ) : (
        <ol className="vx-versions">
          {versions.map((v, i) => (
            <li key={v.id} className={i === 0 ? "is-live" : undefined}>
              <div className="vx-version-top">
                <strong>Versão {v.number}</strong>
                {i === 0 && <span className="vx-pill vx-pill-live">No ar</span>}
                {sourceLabel[v.source] && (
                  <span className="vx-pill">{sourceLabel[v.source]}</span>
                )}
              </div>
              <p className="vx-version-meta">
                {v.author ?? "—"} · {timeAgo(v.created_at)}
              </p>
              {v.note && <p className="vx-version-note">{v.note}</p>}
              <div className="vx-version-actions">
                <button
                  type="button"
                  className="vx-btn vx-btn-ghost vx-btn-sm"
                  disabled={busy !== null}
                  onClick={() => open(v)}
                >
                  Abrir no editor
                </button>
                {canRestore && i > 0 && (
                  <button
                    type="button"
                    className="vx-btn vx-btn-sm"
                    disabled={busy !== null}
                    onClick={() => restore(v)}
                  >
                    {busy === v.id ? "Restaurando…" : "Restaurar"}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
