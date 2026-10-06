"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Home, FileText, BarChart3, MessageSquareText, X } from "lucide-react";

const tabs = [
  { href: "/beranda", label: "Beranda", icon: Home },
  { href: "/artikel", label: "Artikel", icon: FileText },
  { href: "/analitik", label: "Analitik", icon: BarChart3 },
  { href: "/komentar", label: "Komentar", icon: MessageSquareText },
];
const active = (pathname, href) => pathname === href || pathname.startsWith(`${href}/`);

export default function MobileNavigation({ displayName, initials, remainingItems }) {
  const pathname = usePathname();
  const dialogRef = useRef(null);
  const avatarRef = useRef(null);
  const [open, setOpen] = useState(false);
  const accountActive = remainingItems.some((item) => active(pathname, item.href));

  function close() { dialogRef.current?.close(); }
  useEffect(() => { dialogRef.current?.close(); }, [pathname]);
  useEffect(() => {
    const breakpoint = window.matchMedia("(max-width: 1080px)");
    function onResize() { if (!breakpoint.matches) dialogRef.current?.close(); }
    breakpoint.addEventListener("change", onResize);
    return () => breakpoint.removeEventListener("change", onResize);
  }, []);
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [open]);

  return <>
    <nav className="mobile-bottom-nav" aria-label="Navigasi utama mobile">
      {tabs.map((item) => <Link key={item.href} href={item.href} className={`mobile-nav-item${active(pathname, item.href) ? " is-active" : ""}`} aria-current={active(pathname, item.href) ? "page" : undefined}>
        <span className="mobile-nav-icon"><item.icon size={22} aria-hidden="true" /></span><span>{item.label}</span>
      </Link>)}
      <button ref={avatarRef} type="button" className={`mobile-nav-item${open || accountActive ? " is-active" : ""}`} aria-label="Buka menu akun" aria-expanded={open} aria-controls="mobile-account-menu" aria-haspopup="dialog" onClick={() => { dialogRef.current.showModal(); setOpen(true); }}>
        <span className="mobile-nav-avatar editorial-mark" aria-hidden="true">{initials}</span><span>Akun</span>
      </button>
    </nav>
    <dialog ref={dialogRef} id="mobile-account-menu" className="mobile-menu-sheet" aria-labelledby="mobile-account-title" onClose={() => { setOpen(false); avatarRef.current?.focus({ preventScroll: true }); }} onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div className="mobile-menu-content">
        <span className="mobile-sheet-handle" aria-hidden="true" />
        <header className="mobile-menu-heading">
          <div className="mobile-menu-identity"><span className="profile-avatar editorial-mark" aria-hidden="true">{initials}</span><div><h2 id="mobile-account-title">{displayName}</h2><p>Tim editorial</p></div></div>
          <button type="button" className="mobile-sheet-close" onClick={close} aria-label="Tutup menu akun"><X size={22} aria-hidden="true" /></button>
        </header>
        <nav className="mobile-menu-links" aria-label="Menu lainnya">
          {remainingItems.map((item) => <Link key={item.href} href={item.href} onClick={close} className={`mobile-menu-link${active(pathname, item.href) ? " is-active" : ""}${item.href === "/auth/logout" ? " mobile-menu-logout" : ""}`} aria-current={active(pathname, item.href) ? "page" : undefined}>
            <item.icon size={20} aria-hidden="true" /><span>{item.label}</span>
          </Link>)}
        </nav>
      </div>
    </dialog>
  </>;
}
