"use client";
import { useState } from "react";
import MediaPanel from "@/components/MediaPanel";
import LandingRichText from "./LandingRichText";
import LandingDialog from "./LandingDialog";
import { FIELD_LABELS, OPTION_LABELS, resolveField, initialField } from "@/lib/landing-editor.mjs";
import { isSafeLandingUrl } from "@/lib/landing-document.mjs";

function MediaField({ value = {}, onChange, label }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return <fieldset className="landing-field-group"><legend>{label}</legend>
    {value.src && <p className="landing-media-path">{value.src}</p>}
    <button type="button" onClick={() => setOpen(true)}>Pilih / upload gambar</button>
    {value.src && <button type="button" onClick={() => onChange({ src: "", alt: "", caption: "" })}>Kosongkan gambar</button>}
    <label>Alt text (opsional)<input maxLength={500} value={value.alt || ""} onChange={(e) => onChange({ ...value, src: value.src || "", alt: e.target.value })} /></label>
    <label>Caption<input maxLength={500} value={value.caption || ""} onChange={(e) => onChange({ ...value, src: value.src || "", caption: e.target.value })} /></label>
    {open && <LandingDialog label="Pilih gambar" wide busy={busy} onClose={() => setOpen(false)}><header><h2>Pilih gambar</h2><button type="button" disabled={busy} onClick={() => setOpen(false)} aria-label="Tutup pemilih gambar">×</button></header>
      <MediaPanel imagesOnly onBusyChange={setBusy} onChoose={(asset) => {
        if (!isSafeLandingUrl(asset.url)) { setError("Gambar landing harus memakai URL https://."); return; }
        onChange({ src: asset.url, alt: asset.alt || "", caption: asset.caption || "" }); setOpen(false); setError("");
      }} />{error && <p role="alert">{error}</p>}
    </LandingDialog>}
  </fieldset>;
}

export default function LandingFields({ spec, value = {}, onChange, path = "" }) {
  return <div className="landing-fields">{Object.entries(spec.properties).map(([key, rule]) => <Field key={key} name={key} rule={rule} value={value[key]} path={`${path}.${key}`} onChange={(next) => { const updated = { ...value }; if (next === undefined) delete updated[key]; else updated[key] = next; onChange(updated); }} />)}</div>;
}

function Field({ name, rule, value, onChange, path }) {
  const label = FIELD_LABELS[name] || name;
  const field = resolveField(rule);
  if (rule.ref === "richDoc") return <fieldset className="landing-field-group"><legend>{label}</legend><LandingRichText label={label} value={value || initialField(rule)} onChange={onChange} /></fieldset>;
  if (rule.ref === "media") return <MediaField label={label} value={value} onChange={onChange} />;
  if (field.type === "object") return <fieldset className="landing-field-group"><legend>{label}</legend><LandingFields spec={field} value={value || {}} onChange={onChange} path={path} /></fieldset>;
  if (field.type === "array") {
    const items = value || [];
    if (field.items.type === "integer") return <fieldset className="landing-field-group"><legend>{label}</legend><p className="landing-help">Masukkan ID dari daftar konten utama. Hanya konten yang sudah diterbitkan akan tampil.</p>{items.map((item, i) => <div className="landing-array-number" key={i}><input aria-label={`${label} ${i + 1}`} type="number" min={field.items.min} max={field.items.max} value={item} onChange={(e) => onChange(items.map((v, index) => index === i ? Number(e.target.value) : v))} /><button type="button" onClick={() => onChange(items.filter((_, index) => index !== i))}>Hapus</button></div>)}<button type="button" disabled={items.length >= field.max} onClick={() => onChange([...items, field.items.min])}>Tambah ID</button></fieldset>;
    return <fieldset className="landing-field-group"><legend>{label} ({items.length}/{field.max})</legend>{items.map((item, i) => <div key={i} className="landing-array-item"><div className="landing-array-heading"><strong>{label} {i + 1}</strong><button type="button" disabled={items.length <= field.min} onClick={() => onChange(items.filter((_, index) => index !== i))}>Hapus</button></div><LandingFields spec={resolveField(field.items)} value={item} path={`${path}.${i}`} onChange={(next) => onChange(items.map((v, index) => index === i ? next : v))} /></div>)}<button type="button" disabled={items.length >= field.max} onClick={() => onChange([...items, initialField(field.items)])}>Tambah {name === "buttons" ? "tombol" : "item"}</button></fieldset>;
  }
  if (field.enum) return <label>{label}<select value={value ?? ""} onChange={(e) => onChange(e.target.value || undefined)}><option value="" disabled={name !== "systemValue"}>Pilih…</option>{field.enum.map((option) => <option key={option} value={option}>{OPTION_LABELS[option] || option}</option>)}</select></label>;
  if (field.type === "integer") return <label>{label}<input type="number" min={field.min} max={field.max} value={value ?? field.min} onChange={(e) => onChange(Number(e.target.value))} /></label>;
  const invalid = field.safeUrl && value && !isSafeLandingUrl(value);
  return <label>{label}{field.max > 500 && !field.safeUrl ? <textarea rows={3} maxLength={field.max} value={value || ""} onChange={(e) => onChange(e.target.value)} /> : <input maxLength={field.max} value={value || ""} onChange={(e) => onChange(e.target.value)} aria-invalid={Boolean(invalid)} placeholder={field.safeUrl ? "https://… atau /halaman" : undefined} />}{invalid && <small role="alert">URL tidak valid. Gunakan https://, /halaman, atau #anchor.</small>}</label>;
}
