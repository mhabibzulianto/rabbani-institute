import { formatHarvardCitation } from "@/lib/article-citations";
import { getArticleDocument } from "@/lib/gutenberg-content";

export default function ArticleRenderer({ contentRaw, blocks }) {
  const document = getArticleDocument(contentRaw || blocks);

  if (document.kind === "legacy") {
    return (
      <div className="article-content">
        {document.value.map((block, index) => (
          <LegacyArticleBlock block={block} key={block.clientId || `${block.name}-${index}`} />
        ))}
      </div>
    );
  }

  const footnotes = [];
  const footnoteIds = new Set();

  return (
    <div className="article-content">
      {document.value.map((node, index) => (
        <PlateNodeRenderer
          footnoteIds={footnoteIds}
          footnotes={footnotes}
          key={`${node.type || "text"}-${index}`}
          node={node}
        />
      ))}

      {footnotes.length ? (
        <section className="article-footnotes">
          <h2>Catatan kaki</h2>
          <ol>
            {footnotes.map((footnote) => (
              <li id={footnote.id} key={footnote.id}>
                {formatHarvardCitation(footnote)}
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}

function PlateNodeRenderer({ footnoteIds, footnotes, node }) {
  if (typeof node?.text === "string") {
    return <>{renderLeaf(node, footnotes, footnoteIds)}</>;
  }

  const children = (node.children || []).map((child, index) => (
    <PlateNodeRenderer footnoteIds={footnoteIds} footnotes={footnotes} key={`${child.type || "leaf"}-${index}`} node={child} />
  ));

  switch (node.type) {
    case "hr":
      return <hr />;
    case "h1":
      return <h2>{children}</h2>;
    case "h2":
      return <h3>{children}</h3>;
    case "h3":
      return <h4>{children}</h4>;
    case "blockquote":
      return <blockquote className="article-quote-block">{children}</blockquote>;
    case "ayah-quote":
      return <blockquote className="article-quran-block">{children}</blockquote>;
    case "arabic-quote":
      return <blockquote className="article-arabic-block">{children}</blockquote>;
    case "ul":
      return <ul style={{ listStyleType: node.listStyleType || "disc" }}>{children}</ul>;
    case "ol":
      return <ol start={node.start || 1} style={{ listStyleType: node.listStyleType || "decimal" }}>{children}</ol>;
    case "li":
      return <li>{children}</li>;
    case "columns-2":
    case "columns-3":
      return <div className={`article-columns ${node.type === "columns-3" ? "is-three" : "is-two"}`}>{children}</div>;
    case "column-item":
      return <div className="article-column-item">{children}</div>;
    case "table":
      return (
        <div className="article-table-wrap">
          <table className="article-table">
            <tbody>{children}</tbody>
          </table>
        </div>
      );
    case "table-row":
      return <tr>{children}</tr>;
    case "table-cell":
      return <td>{children}</td>;
    case "image":
      return (
        <figure className="article-image-block">
          <div className="article-image-shell">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt={node.alt || ""} src={node.src} />
          </div>
          {node.caption || node.filename ? <figcaption>{node.caption || node.filename}</figcaption> : null}
        </figure>
      );
    case "video":
      return (
        <figure className="article-media-block">
          <video controls src={node.src} />
          {node.caption || node.filename ? <figcaption>{node.caption || node.filename}</figcaption> : null}
        </figure>
      );
    case "audio":
      return (
        <figure className="article-media-block">
          <audio controls src={node.src} />
          {node.caption || node.filename ? <figcaption>{node.caption || node.filename}</figcaption> : null}
        </figure>
      );
    case "document":
      return (
        <div className="article-document-block">
          <strong>{node.filename || "Dokumen artikel"}</strong>
          {node.caption ? <p>{node.caption}</p> : null}
          <a href={node.src} rel="noreferrer" target="_blank">
            Buka dokumen
          </a>
        </div>
      );
    case "p":
    default:
      return <p style={getBlockStyle(node)}>{children}</p>;
  }
}

function renderLeaf(leaf, footnotes, footnoteIds) {
  let content = leaf.text;

  if (leaf.linkUrl) {
    content = (
      <a href={leaf.linkUrl} rel="noreferrer" target="_blank" title={leaf.linkTitle || leaf.linkUrl}>
        {content}
      </a>
    );
  }
  if (leaf.kbd) {
    content = <kbd>{content}</kbd>;
  }
  if (leaf.code) {
    content = <code>{content}</code>;
  }
  if (leaf.bold) {
    content = <strong>{content}</strong>;
  }
  if (leaf.italic) {
    content = <em>{content}</em>;
  }
  if (leaf.underline) {
    content = <u>{content}</u>;
  }
  if (leaf.strikethrough) {
    content = <s>{content}</s>;
  }
  if (leaf.subscript) {
    content = <sub>{content}</sub>;
  }
  if (leaf.superscript) {
    content = <sup>{content}</sup>;
  }
  if (leaf.footnoteCitation?.id) {
    if (!footnoteIds.has(leaf.footnoteCitation.id)) {
      footnoteIds.add(leaf.footnoteCitation.id);
      footnotes.push(leaf.footnoteCitation);
    }

    content = (
      <sup className="article-footnote-mark">
        <a href={`#${leaf.footnoteCitation.id}`}>{leaf.footnoteCitation.number || content}</a>
      </sup>
    );
  }

  return content;
}

function LegacyArticleBlock({ block }) {
  switch (block?.name) {
    case "core/heading": {
      const level = clampHeadingLevel(block.attributes?.level);
      const Tag = `h${level}`;
      return <Tag dangerouslySetInnerHTML={{ __html: block.attributes?.content || "" }} />;
    }
    case "core/list": {
      const Tag = block.attributes?.ordered ? "ol" : "ul";
      return <Tag dangerouslySetInnerHTML={{ __html: block.attributes?.values || block.innerHTML || "" }} />;
    }
    case "core/quote":
      return (
        <blockquote className="article-quote-block">
          <div dangerouslySetInnerHTML={{ __html: block.attributes?.value || block.innerHTML || "" }} />
          {block.attributes?.citation ? (
            <cite dangerouslySetInnerHTML={{ __html: block.attributes.citation }} />
          ) : null}
        </blockquote>
      );
    case "core/separator":
      return <hr className="article-separator-block" />;
    case "core/paragraph":
    default:
      return <p dangerouslySetInnerHTML={{ __html: block.attributes?.content || "" }} />;
  }
}

function clampHeadingLevel(level) {
  const parsed = Number(level || 2);
  if (!Number.isFinite(parsed)) {
    return 2;
  }

  return Math.max(2, Math.min(4, parsed));
}

function getBlockStyle(node) {
  return {
    textAlign: node.align || "left",
    marginInlineStart: `${Number(node.indent || 0) * 1.5}rem`,
  };
}
