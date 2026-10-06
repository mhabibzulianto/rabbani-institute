"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Eye, Pencil, X } from "lucide-react";

export default function ArticlePreviewDrawer({ children, onClose, articleId }) {
  const panelRef = useRef(null);
  const closeRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus({ preventScroll: true });
    function onKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
      }
      if (event.key !== "Tab") return;
      const elements = Array.from(panelRef.current.querySelectorAll('a[href], button, input, select, textarea, [tabindex="0"], audio[controls], video[controls]')).filter((element) => element.getClientRects().length);
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);
  return <div className="article-preview-overlay">
    <button type="button" onClick={onClose} className="article-preview-backdrop" aria-label="Tutup preview di luar panel" tabIndex={-1} />
    <section className="article-preview-drawer" ref={panelRef} role="dialog" aria-modal="true" aria-label="Preview artikel">
      <header className="article-preview-toolbar">
        <div className="article-preview-toolbar-heading">
          <span><Eye size={17} aria-hidden="true" />Preview artikel</span>
          <button type="button" ref={closeRef} onClick={onClose} className="secondary-button article-preview-close" aria-label="Tutup preview" title="Tutup preview"><X size={20} aria-hidden="true" /></button>
        </div>
        <nav className="article-preview-actions" aria-label="Aksi artikel">
          <Link className="primary-button" href={`/artikel/${articleId}/edit`}><Pencil size={16} aria-hidden="true" />Buka di editor</Link>
          <Link className="secondary-button" href={`/artikel/${articleId}/preview`}><Eye size={16} aria-hidden="true" />Preview publik</Link>
        </nav>
      </header>
      <div className="article-preview-drawer-content">{children}</div>
    </section>
  </div>;
}
