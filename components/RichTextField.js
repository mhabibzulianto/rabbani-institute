"use client";

import { useId, useRef } from "react";

const actions = [
  { key: "bold", label: "B", title: "Tebal" },
  { key: "italic", label: "I", title: "Miring" },
  { key: "olist", label: "1.", title: "Daftar bernomor" },
  { key: "ulist", label: "- ", title: "Daftar poin" },
];

export default function RichTextField({
  label,
  name,
  defaultValue = "",
  dir,
  rows = 8,
  helperText,
}) {
  const fieldId = useId();
  const textAreaRef = useRef(null);

  function applyFormat(type) {
    const element = textAreaRef.current;

    if (!element) {
      return;
    }

    const start = element.selectionStart;
    const end = element.selectionEnd;
    const selected = element.value.slice(start, end);
    const replacement = formatSelection(type, selected);

    element.focus();
    element.setRangeText(replacement, start, end, "end");
    element.dispatchEvent(new Event("input", { bubbles: true }));
  }

  return (
    <label className="richtext-field" htmlFor={fieldId}>
      <span>{label}</span>
      <div className="format-toolbar" aria-label={`Format ${label}`}>
        {actions.map((action) => (
          <button
            key={action.key}
            className="format-chip"
            type="button"
            title={action.title}
            aria-label={action.title}
            onClick={() => applyFormat(action.key)}
          >
            {action.label}
          </button>
        ))}
      </div>
      <textarea
        id={fieldId}
        ref={textAreaRef}
        name={name}
        rows={rows}
        dir={dir}
        defaultValue={defaultValue}
      />
      {helperText ? <span className="muted-line">{helperText}</span> : null}
    </label>
  );
}

function formatSelection(type, selectedText) {
  const text = selectedText || "Tulis di sini";

  switch (type) {
    case "bold":
      return `**${text}**`;
    case "italic":
      return `*${text}*`;
    case "olist":
      return normalizeLines(text)
        .map((line, index) => `${index + 1}. ${stripListPrefix(line)}`)
        .join("\n");
    case "ulist":
      return normalizeLines(text)
        .map((line) => `- ${stripListPrefix(line)}`)
        .join("\n");
    default:
      return text;
  }
}

function normalizeLines(text) {
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);
}

function stripListPrefix(line) {
  return line.replace(/^\s*(?:[-*]|\d+\.)\s+/, "").trim() || "Item";
}
