"use client";

import { createContext, useContext, useRef, useState } from "react";
import type { Field } from "@puckeditor/core";
import type { FieldDef } from "./schema";

export const EditorContext = createContext<{ siteSlug: string } | null>(null);

function ImageField({
  value,
  onChange,
  label,
  readOnly,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  readOnly?: boolean;
}) {
  const ctx = useContext(EditorContext);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const upload = async (file: File) => {
    if (!ctx) return;
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(`/api/sites/${ctx.siteSlug}/uploads`, {
        method: "POST",
        body,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Falha no envio.");
      onChange(json.url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="vx-field">
      <span className="vx-field-label">{label}</span>
      <div
        className={`vx-image ${value ? "has-image" : ""}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0];
          if (f) upload(f);
        }}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" />
        ) : (
          <span>Arraste uma imagem aqui</span>
        )}
      </div>
      <div className="vx-image-actions">
        <button
          type="button"
          disabled={readOnly || busy || !ctx}
          onClick={() => input.current?.click()}
        >
          {busy ? "Enviando…" : value ? "Trocar" : "Enviar imagem"}
        </button>
        {value && (
          <button
            type="button"
            disabled={readOnly}
            onClick={() => onChange("")}
          >
            Remover
          </button>
        )}
      </div>
      <input
        className="vx-input"
        value={value || ""}
        placeholder="ou cole o endereço da imagem"
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)}
      />
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/avif,image/svg+xml"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = "";
        }}
      />
      {error && <span className="vx-field-error">{error}</span>}
    </div>
  );
}

function ColorField({
  value,
  onChange,
  label,
  readOnly,
  optional,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  readOnly?: boolean;
  optional?: boolean;
}) {
  const valid = /^#[0-9a-fA-F]{6}$/.test(value || "");
  return (
    <div className="vx-field">
      <span className="vx-field-label">{label}</span>
      <div className="vx-color">
        <input
          type="color"
          value={valid ? value : "#000000"}
          disabled={readOnly}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          className={optional && !valid ? "is-empty" : undefined}
        />
        <input
          className="vx-input"
          value={value || ""}
          placeholder={optional ? "padrão do tema" : "#rrggbb"}
          readOnly={readOnly}
          onChange={(e) => onChange(e.target.value)}
        />
        {optional && value && (
          <button
            type="button"
            className="vx-clear"
            disabled={readOnly}
            onClick={() => onChange("")}
          >
            Limpar
          </button>
        )}
      </div>
    </div>
  );
}

/** Convert a schema field into a Puck field. */
export function toPuckField(def: FieldDef): Field {
  switch (def.type) {
    case "text":
      return { type: "text", label: def.label };
    case "textarea":
      return { type: "textarea", label: def.label };
    case "number":
      return { type: "number", label: def.label, min: def.min, max: def.max };
    case "select":
      return { type: "select", label: def.label, options: def.options };
    case "boolean":
      return {
        type: "radio",
        label: def.label,
        options: [
          { label: "Sim", value: true },
          { label: "Não", value: false },
        ],
      };
    case "color":
      return {
        type: "custom",
        label: def.label,
        render: ({ value, onChange, readOnly }) => (
          <ColorField
            value={value}
            onChange={onChange}
            label={def.label}
            readOnly={readOnly}
            optional={def.optional}
          />
        ),
      };
    case "image":
      return {
        type: "custom",
        label: def.label,
        render: ({ value, onChange, readOnly }) => (
          <ImageField
            value={value}
            onChange={onChange}
            label={def.label}
            readOnly={readOnly}
          />
        ),
      };
    case "list": {
      const arrayFields: Record<string, Field> = {};
      const defaults: Record<string, unknown> = {};
      for (const [k, f] of Object.entries(def.item)) {
        arrayFields[k] = toPuckField(f);
        defaults[k] =
          f.type === "boolean"
            ? false
            : f.type === "select"
            ? f.options[0].value
            : f.type === "color"
            ? "#888888"
            : "";
      }
      return {
        type: "array",
        label: def.label,
        max: def.max,
        arrayFields,
        defaultItemProps: defaults,
        getItemSummary: (item: Record<string, unknown>, i?: number) =>
          String(item?.[def.summary] || `Item ${(i ?? 0) + 1}`),
      } as Field;
    }
  }
}
