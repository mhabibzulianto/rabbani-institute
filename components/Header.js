"use client";

import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { platformUrls } from "@/lib/platform-urls";

export default function Header({ host = "" }) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const isHome = pathname === "/";
  const accountHost = (process.env.NEXT_PUBLIC_ACCOUNT_HOST || "account.rabbaniinstitute.id").toLowerCase();
  const hideOnAccountRoot = host === accountHost && pathname === "/";

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 36);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = (
    <>
      <Link href="/">Beranda</Link>
      <Link href={platformUrls.classesHome}>Kelas</Link>
      <Link href={platformUrls.articleHome}>Artikel</Link>
      <Link href="/faq">FAQ</Link>
      <Link className="nav-search-link" href="/search" aria-label="Cari">
        <Search size={18} strokeWidth={2.2} />
      </Link>
    </>
  );

  const authButtons = (
    <Link className="button primary small" href="https://madrasah.rabbaniinstitute.id">
      Madrasah
    </Link>
  );

  if (hideOnAccountRoot) {
    return null;
  }

  return (
    <header className={`site-header${isHome ? " is-home" : " is-subpage"}${isScrolled ? " is-scrolled" : ""}`}>
      <div className="header-inner">
        <Link className="brand header-logo" href="/">
          <span className="brand-mark">
            <Image
              src="/images/rabbani-logo.jpg"
              alt="Logo Rabbani Institute"
              width={42}
              height={42}
              sizes="42px"
              priority
            />
          </span>
          <span>rabbani-institute</span>
        </Link>

        <nav className="nav header-nav" aria-label="Navigasi utama">
          {navLinks}
        </nav>

        <div className="header-actions header-auth">{authButtons}</div>

        <button
          className="menu-toggle hamburger"
          type="button"
          aria-expanded={isMenuOpen}
          aria-controls="mobile-navigation"
          aria-label={isMenuOpen ? "Tutup menu" : "Buka menu"}
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <div className={`mobile-menu${isMenuOpen ? " is-open" : ""}`} id="mobile-navigation">
        <nav className="mobile-nav" aria-label="Navigasi mobile">
          {navLinks}
        </nav>
        <div className="mobile-auth">{authButtons}</div>
      </div>
    </header>
  );
}
