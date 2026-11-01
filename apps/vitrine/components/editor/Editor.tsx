"use client";

import {
  blocksPlugin,
  outlinePlugin,
  Puck,
  useGetPuck,
  type Data,
  type Plugin,
} from "@puckeditor/core";
import { History, Layers, LayoutGrid, Sparkles } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { config } from "@/blocks/config";
import { EditorContext } from "@/blocks/fields";
import { AiPanel } from "./AiPanel";
import { HistoryPanel } from "./HistoryPanel";
import { ptBR } from "./dictionary";

type Role = "owner" | "admin" | "editor";
type SaveState = "saved" | "saving" | "dirty" | "error";

type Props = {
  site: { slug: string; name: string };
  path: string;
  pages: string[];
  role: Role;
  data: Data;
  aiEnabled: boolean;
  initialPrompt?: string;
  liveUrl: string;
};

type HeaderState = {
  props: Omit<Props, "data" | "aiEnabled" | "initialPrompt">;
  saveState: SaveState;
  onPublished: (v: number) => void;
};
const HeaderContext = createContext<HeaderState | null>(null);
const VersionsContext = createContext<{ key: number; bump: () => void }>({
  key: 0,
  bump: () => {},
});

function HistorySlot({
  siteSlug,
  path,
  canRestore,
}: {
  siteSlug: string;
  path: string;
  canRestore: boolean;
}) {
  const v = useContext(VersionsContext);
  return (
    <HistoryPanel
      siteSlug={siteSlug}
      path={path}
      canRestore={canRestore}
      refreshKey={v.key}
      onRestored={v.bump}
    />
  );
}

function HeaderSlot() {
  const ctx = useContext(HeaderContext);
  if (!ctx) return null;
  return (
    <HeaderActions
      {...ctx.props}
      saveState={ctx.saveState}
      onPublished={ctx.onPublished}
    />
  );
}

async function post(slug: string, body: unknown) {
  const res = await fetch(`/api/sites/${slug}/pages`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Falha ao salvar.");
  return json;
}

function HeaderActions({
  site,
  path,
  pages,
  role,
  liveUrl,
  saveState,
  onPublished,
}: Omit<Props, "data" | "aiEnabled" | "initialPrompt"> & {
  saveState: SaveState;
  onPublished: (v: number) => void;
}) {
  const getPuck = useGetPuck();
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const canPublish = role !== "editor";

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const act = async (action: "publish" | "review") => {
    setBusy(true);
    try {
      const data = getPuck().appState.data;
      const res = await post(site.slug, { action, path, data, note: "" });
      if (action === "publish") {
        setToast(`Publicado como versão ${res.version}.`);
        onPublished(res.version);
      } else setToast("Enviado para revisão do administrador.");
    } catch (e) {
      setToast((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const label = {
    saved: "Rascunho salvo",
    saving: "Salvando…",
    dirty: "Alterações não salvas",
    error: "Erro ao salvar",
  }[saveState];

  return (
    <div className="vx-header-actions">
      <span className={`vx-save vx-save-${saveState}`}>{label}</span>
      <select
        className="vx-page-select"
        value={path}
        aria-label="Página"
        onChange={(e) => {
          window.location.href = `/app/s/${
            site.slug
          }/edit?path=${encodeURIComponent(e.target.value)}`;
        }}
      >
        {pages.map((p) => (
          <option key={p} value={p}>
            {p === "/" ? "Página inicial" : p}
          </option>
        ))}
      </select>
      <a
        className="vx-btn vx-btn-ghost"
        href={liveUrl}
        target="_blank"
        rel="noreferrer"
      >
        Ver no ar
      </a>
      {canPublish ? (
        <button
          type="button"
          className="vx-btn vx-btn-accent"
          disabled={busy}
          onClick={() => act("publish")}
        >
          {busy ? "Publicando…" : "Publicar"}
        </button>
      ) : (
        <button
          type="button"
          className="vx-btn vx-btn-accent"
          disabled={busy}
          onClick={() => act("review")}
        >
          {busy ? "Enviando…" : "Enviar para revisão"}
        </button>
      )}
      {toast && (
        <div className="vx-toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}

export function Editor(props: Props) {
  const { site, path, role, data, aiEnabled, initialPrompt } = props;
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [versionsKey, setVersionsKey] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<Data | null>(null);

  const flush = useCallback(async () => {
    const next = pending.current;
    if (!next) return;
    pending.current = null;
    setSaveState("saving");
    try {
      await post(site.slug, { action: "draft", path, data: next });
      setSaveState(pending.current ? "dirty" : "saved");
    } catch {
      setSaveState("error");
    }
  }, [site.slug, path]);

  const onChange = useCallback(
    (next: Data) => {
      pending.current = next;
      setSaveState("dirty");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, 900);
    },
    [flush]
  );

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (pending.current) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  const plugins = useMemo<Plugin[]>(
    () => [
      {
        name: "ai",
        label: "IA",
        icon: <Sparkles />,
        render: () => (
          <AiPanel
            siteSlug={site.slug}
            path={path}
            enabled={aiEnabled}
            initialPrompt={initialPrompt}
          />
        ),
      },
      blocksPlugin({ label: "Blocos", icon: <LayoutGrid /> }),
      outlinePlugin({ label: "Estrutura", icon: <Layers /> }),
      {
        name: "history",
        label: "Versões",
        icon: <History />,
        render: () => (
          <HistorySlot
            siteSlug={site.slug}
            path={path}
            canRestore={role !== "editor"}
          />
        ),
      },
    ],
    [site.slug, path, aiEnabled, initialPrompt, role]
  );

  const onPublished = useCallback(() => {
    setSaveState("saved");
    setVersionsKey((k) => k + 1);
  }, []);
  const versionsCtx = useMemo(
    () => ({ key: versionsKey, bump: () => setVersionsKey((k) => k + 1) }),
    [versionsKey]
  );
  const overrides = useMemo(
    () => ({ headerActions: () => <HeaderSlot /> }),
    []
  );
  const headerState: HeaderState = {
    props: {
      site: props.site,
      path: props.path,
      pages: props.pages,
      role: props.role,
      liveUrl: props.liveUrl,
    },
    saveState,
    onPublished,
  };

  const permissions =
    role === "editor"
      ? { insert: true, delete: false, drag: true, duplicate: true, edit: true }
      : { insert: true, delete: true, drag: true, duplicate: true, edit: true };

  return (
    <EditorContext.Provider value={{ siteSlug: site.slug }}>
      <HeaderContext.Provider value={headerState}>
        <VersionsContext.Provider value={versionsCtx}>
          <div className="vx-editor">
            <Puck
              config={config}
              data={data}
              plugins={plugins}
              permissions={permissions}
              metadata={{ siteSlug: site.slug, path }}
              headerTitle={site.name}
              headerPath={path}
              onChange={onChange}
              iframe={{ enabled: true, waitForStyles: true }}
              overrides={overrides}
              dictionary={ptBR}
            />
          </div>
        </VersionsContext.Provider>
      </HeaderContext.Provider>
    </EditorContext.Provider>
  );
}
