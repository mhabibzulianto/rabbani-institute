"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  ChevronDown,
  FileCog,
  FileText,
  Flag,
  Home,
  ImageIcon,
  LogOut,
  MessageSquareText,
  MonitorSmartphone,
  Settings,
} from "lucide-react";

const primaryItems = [
  { href: "/beranda", label: "Beranda", icon: Home },
  { href: "/artikel", label: "Artikel", icon: FileText },
  { href: "/media", label: "Media", icon: ImageIcon },
];

const readerItems = [
  { href: "/analitik", label: "Analitik", icon: BarChart3 },
  { href: "/komentar", label: "Komentar", icon: MessageSquareText },
];

const settingItems = [
  { href: "/halaman-utama", label: "Halaman utama", icon: MonitorSmartphone },
  { href: "/tentang", label: "Tentang", icon: FileCog },
  { href: "/kontak", label: "Kontak", icon: FileText },
];

const profileItems = [
  { href: "/pengaturan", label: "Pengaturan", icon: Settings },
  { href: "/laporkan-masalah", label: "Laporkan masalah", icon: Flag },
];

function isActive(pathname, href) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function getInitials(name) {
  return `${name || "Editorial Rabbani Institute"}`
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function AppShell({ children, profile }) {
  const pathname = usePathname();
  const displayName = profile?.full_name || "Pengguna Rabbani";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-card">
          <div className="brand-mark editorial-mark">E</div>
          <div>
            <p className="brand-title">Editorial</p>
            <p className="brand-subtitle">Rabbani Institute</p>
          </div>
        </div>

        <nav className="sidebar-section">
          <p className="sidebar-label">Grup 1</p>
          <div className="sidebar-list">
            {primaryItems.map((item) => (
              <Link
                key={item.href}
                className={`sidebar-link ${isActive(pathname, item.href) ? "is-active" : ""}`}
                href={item.href}
              >
                <item.icon size={16} />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>

        <details className="sidebar-section sidebar-collapsible" open>
          <summary className="sidebar-summary">
            <span>Pembaca</span>
            <ChevronDown size={16} />
          </summary>
          <div className="sidebar-list sidebar-sublist">
            {readerItems.map((item) => (
              <Link
                key={item.href}
                className={`sidebar-link ${isActive(pathname, item.href) ? "is-active" : ""}`}
                href={item.href}
              >
                <item.icon size={16} />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </details>

        <details className="sidebar-section sidebar-collapsible" open>
          <summary className="sidebar-summary">
            <span>Setting</span>
            <ChevronDown size={16} />
          </summary>
          <div className="sidebar-list sidebar-sublist">
            {settingItems.map((item) => (
              <Link
                key={item.href}
                className={`sidebar-link ${isActive(pathname, item.href) ? "is-active" : ""}`}
                href={item.href}
              >
                <item.icon size={16} />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </details>

        <details className="profile-card">
          <summary className="profile-summary">
            <div className="profile-avatar editorial-mark">{getInitials(displayName)}</div>
            <div className="profile-text">
              <span className="profile-name">{displayName}</span>
              <span className="profile-role">Tim editorial</span>
            </div>
            <ChevronDown size={16} />
          </summary>
          <div className="sidebar-list">
            {profileItems.map((item) => (
              <Link
                key={item.href}
                className={`sidebar-link ${isActive(pathname, item.href) ? "is-active" : ""}`}
                href={item.href}
              >
                <item.icon size={16} />
                <span>{item.label}</span>
              </Link>
            ))}
            <Link className="sidebar-link" href="/auth/logout">
              <LogOut size={16} />
              <span>Logout</span>
            </Link>
          </div>
        </details>
      </aside>

      <div className="content-shell">{children}</div>
    </div>
  );
}
