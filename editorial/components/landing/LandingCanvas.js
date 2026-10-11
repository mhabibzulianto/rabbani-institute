"use client";
import { BLOCK_LABELS } from "@/lib/landing-editor.mjs";
import { isSafeLandingUrl } from "@/lib/landing-document.mjs";

function RichText({ node }) {
  if (!node) return null;
  if (node.type === "text") {
    let text = node.text;
    for (const mark of node.marks || []) {
      if (mark.type === "bold") text = <strong>{text}</strong>;
      if (mark.type === "italic") text = <em>{text}</em>;
      if (mark.type === "strike") text = <s>{text}</s>;
      if (mark.type === "link") text = <span className="landing-sample-link">{text}</span>;
    }
    return text;
  }
  if (node.type === "hardBreak") return <br />;
  const tags = { doc: "div", paragraph: "p", bulletList: "ul", orderedList: "ol", listItem: "li", heading: `h${Math.max(2, Math.min(4, node.attrs?.level || 2))}` };
  const Tag = tags[node.type] || "div";
  return <Tag>{node.content?.map((child, i) => <RichText key={i} node={child} />)}</Tag>;
}
function MediaImage({ media }) {
  if (!media?.src || !isSafeLandingUrl(media.src)) return <div className="landing-image-placeholder">Gambar belum dipilih</div>;
  // eslint-disable-next-line @next/next/no-img-element
  return <figure><img src={media.src} alt={media.alt || ""} loading="lazy" />{media.caption && <figcaption>{media.caption}</figcaption>}</figure>;
}
function BlockContents({ block }) {
  const p = block.props;
  const heading = <>{p.label && <small className="landing-sample-label">{p.label}</small>}{p.title && (block.type === "hero" ? <h1>{p.title}</h1> : <h2>{p.title}</h2>)}{p.description && <p>{p.description}</p>}</>;
  const buttons = p.buttons?.length ? <div className="landing-sample-buttons">{p.buttons.map((button, i) => <span key={i}>{button.label || "Tombol"}</span>)}</div> : null;
  if (block.type === "imageText") return <div className={`landing-sample-split ${p.imagePosition === "left" ? "image-first" : ""}`}><div>{heading}<RichText node={p.content} />{buttons}</div><MediaImage media={p.image} /></div>;
  if (block.type === "hero") return <div className={p.image?.src ? `landing-sample-split ${p.imagePosition === "left" ? "image-first" : ""}` : ""}><div>{heading}{buttons}</div>{p.image?.src && <MediaImage media={p.image} />}</div>;
  if (block.type === "text") return <>{heading}<RichText node={p.content} /></>;
  if (block.type === "features") return <>{heading}<div className="landing-sample-grid">{p.items.map((item, i) => <div key={i}><span className="landing-feature-icon" aria-hidden="true">{({ book: "▤", graduation: "◇", shield: "⬡", sparkles: "✦", check: "✓" })[item.icon] || "◇"}</span><h3>{item.title}</h3><p>{item.description}</p>{item.systemValue && <small>Nilai dinamis dari situs utama</small>}</div>)}</div></>;
  if (["courses", "exams", "articles"].includes(block.type)) return <>{heading}<div className="landing-sample-grid">{Array.from({ length: Math.max(1, Math.min(12, p.limit || 3)) }, (_, i) => <div key={i} className="landing-content-placeholder"><div /><h3>{BLOCK_LABELS[block.type]} {p.source === "selected" ? p.selectedIds[i] || "pilihan" : i + 1}</h3><p>Konten publik dari situs utama</p></div>)}</div><p className="landing-help">{p.source === "selected" ? "Pilihan manual" : "Konten terbaru"} · Buka Preview situs untuk melihat data asli.</p>{p.catalogLabel && <span className="landing-sample-link">{p.catalogLabel} →</span>}</>;
  if (block.type === "faq") return <>{heading}<dl>{p.items.map((item, i) => <div key={i}><dt>{item.question || "Pertanyaan"}</dt><dd>{item.answer}</dd></div>)}</dl></>;
  return <>{heading}{buttons}</>;
}

export default function LandingCanvas({ document, selected, onSelect, viewport }) {
  return <div className={`landing-canvas-page ${viewport === "mobile" ? "is-mobile" : ""}`}>
    <div className="landing-canvas-brand"><strong>Rabbani Institute</strong><small>Kanvas draft</small></div>
    {document.blocks.map((block, i) => <article id={`landing-block-${block.id}`} key={block.id} className={`landing-canvas-block block-${block.type} variant-${block.props.variant || "default"}${selected === block.id ? " is-selected" : ""}${!block.enabled ? " is-hidden" : ""}`} onClick={() => onSelect(block.id)}>
      <button type="button" className="landing-block-select" aria-pressed={selected === block.id} onClick={() => onSelect(block.id)}>{String(i + 1).padStart(2, "0")} · {BLOCK_LABELS[block.type]}{!block.enabled && " · disembunyikan"}</button>
      <BlockContents block={block} />
    </article>)}
    <div className="landing-canvas-end">Akhir halaman · draft belum diterbitkan</div>
  </div>;
}
