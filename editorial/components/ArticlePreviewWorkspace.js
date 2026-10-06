"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ArticlePreviewDrawer from "./ArticlePreviewDrawer";

const PreviewContext = createContext(null);

export function ArticlePreviewLoading() {
  return <div className="article-preview-loading" role="status" aria-busy="true">
    <p>Memuat preview artikel…</p>
    <div className="article-skeleton article-skeleton-row" />
    <div className="article-preview-loading-meta">{Array.from({ length: 4 }, (_, index) => <div className="article-skeleton article-skeleton-row" key={index} />)}</div>
    <div className="article-skeleton article-skeleton-heading" />
    {Array.from({ length: 3 }, (_, index) => <div className="article-skeleton article-skeleton-row" key={index} />)}
  </div>;
}

export function ArticlePreviewLink({ articleId, children, ...props }) {
  const open = useContext(PreviewContext);
  return <Link {...props} scroll={false} onClick={(event) => {
    if (!event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) open?.(String(articleId));
  }}>{children}</Link>;
}

export default function ArticlePreviewWorkspace({ children, previewId, preview, closeHref }) {
  const router = useRouter();
  const [activeId, setActiveId] = useState(previewId);
  useEffect(() => { setActiveId(previewId); }, [previewId]);
  function close() {
    setActiveId("");
    router.replace(closeHref, { scroll: false });
  }
  return <PreviewContext.Provider value={setActiveId}>
    <div className="article-list-background" inert={Boolean(activeId)}>{children}</div>
    {activeId && <ArticlePreviewDrawer onClose={close} articleId={activeId}>
      {activeId === previewId && preview ? preview : <ArticlePreviewLoading />}
    </ArticlePreviewDrawer>}
  </PreviewContext.Provider>;
}
