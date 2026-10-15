/* eslint-disable @next/next/no-img-element */
import { collectionItems } from "./collections.mjs";
import { isSafeLandingUrl } from "./schema.mjs";
import { landingHeadings } from "./headings.mjs";
import { preparePublicLandingDocument } from "./public-content.mjs";

function Buttons({ items = [], className = "hero-actions" }) {
  return <div className={className}>{items.filter((b) => b.href && isSafeLandingUrl(b.href)).map((b, i) => <a key={i} className={`button ${i ? "secondary" : "primary"}`} href={b.href}>{b.label}</a>)}</div>;
}
function Media({ image, priority = false }) {
  if (!image?.src || image.src.startsWith("#") || !isSafeLandingUrl(image.src)) return null;
  return <figure className="landing-render-image"><img src={image.src} alt={image.alt || ""} loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} decoding="async" />{image.caption && <figcaption>{image.caption}</figcaption>}</figure>;
}
export function LandingRichText({ node }) {
  if (!node) return null;
  if (node.type === "text") {
    let child = node.text;
    for (const mark of node.marks || []) {
      if (mark.type === "bold") child = <strong>{child}</strong>;
      if (mark.type === "italic") child = <em>{child}</em>;
      if (mark.type === "strike") child = <s>{child}</s>;
      if (mark.type === "link" && mark.attrs?.href && isSafeLandingUrl(mark.attrs.href)) child = <a href={mark.attrs.href}>{child}</a>;
    }
    return child;
  }
  if (node.type === "hardBreak") return <br />;
  const Tag = { doc: "div", paragraph: "p", bulletList: "ul", orderedList: "ol", listItem: "li", heading: `h${Math.max(2, Math.min(4, node.attrs?.level || 2))}` }[node.type];
  if (!Tag) return null;
  return <Tag {...(node.type === "orderedList" && node.attrs?.start ? { start: node.attrs.start } : {})}>{node.content?.map((n, i) => <LandingRichText key={i} node={n} />)}</Tag>;
}
export default function LandingRenderer({ document, pools = {}, cards = {}, paymentReady = false, articleCatalogUrl }) {
  let heroSeen = false;
  const publicDocument = preparePublicLandingDocument(document, articleCatalogUrl);
  return <main className="landing-page">{publicDocument.blocks.filter((b) => b.enabled).map((block) => {
    const p = block.props;
    const isHero = block.type === "hero";
    const Title = isHero && !heroSeen ? "h1" : "h2";
    if (isHero) heroSeen = true;
    const heading = <div className={isHero ? "hero-copy hero-copy-home" : "section-heading"}>{p.label && <p className={isHero ? "eyebrow" : "section-label"}>{p.label}</p>}{p.title && <Title>{p.title}</Title>}{p.description && <p>{p.description}</p>}{isHero && <Buttons items={p.buttons} />}</div>;
    if (isHero) return <section key={block.id} id={block.id} className={`hero hero-home landing-variant-${p.variant || "default"}`}><div className={`hero-shell landing-render-split image-${p.imagePosition || "right"}`}>{heading}<Media image={p.image} priority={Title === "h1"} /></div></section>;
    let body;
    if (block.type === "features") body = <div className="landing-feature-grid">{p.items.map((item, i) => <article className="panel landing-feature-card" key={i}><span aria-hidden="true">{({ book: "▤", graduation: "◇", shield: "⬡", sparkles: "✦", check: "✓" })[item.icon]} </span><strong>{item.systemValue === "payment-status" && paymentReady ? "Pembayaran kelas tersedia" : item.title}</strong><p>{item.systemValue === "payment-status" && paymentReady ? "Daftar dan bayar kelas pilihan Anda secara online." : item.description}</p></article>)}</div>;
    else if (block.type === "text") body = <div className="landing-rich-text"><LandingRichText node={landingHeadings(p.content, p.title ? 2 : 1)} /></div>;
    else if (block.type === "imageText") body = <div className={`landing-render-split image-${p.imagePosition || "right"}`}><div className="landing-rich-text"><LandingRichText node={landingHeadings(p.content, 2)} /><Buttons items={p.buttons} /></div><Media image={p.image} /></div>;
    else if (block.type === "cta") return <section key={block.id} id={block.id} className={`section landing-cta-section landing-variant-${p.variant || "default"}`}><div className="landing-cta-shell">{heading}<Buttons items={p.buttons} className="landing-cta-actions" /></div></section>;
    else if (block.type === "faq") body = <div className="landing-faq">{p.items.map((item, i) => <details key={i}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div>;
    else if (cards[block.type]) {
      const Card = cards[block.type];
      const items = collectionItems(block, pools);
      body = <><div className="course-grid">{items.length ? items.map((item, index) => <Card key={item.id} item={item} index={index} />) : <article className="panel"><p>{p.emptyMessage || "Belum ada konten publik yang tersedia."}</p></article>}</div>{p.catalogUrl && isSafeLandingUrl(p.catalogUrl) && <div className="landing-section-actions"><a className="button secondary" href={p.catalogUrl}>{p.catalogLabel || "Lihat semua"}</a></div>}</>;
    } else return null;
    return <section key={block.id} id={block.id} className="section">{heading}{body}</section>;
  })}</main>;
}
