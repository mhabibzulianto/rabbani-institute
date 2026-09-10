"use client";

// src/components/admin/app-sidebar.tsx
// Requires: npx shadcn@latest add sidebar tooltip avatar

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  ClipboardList,
  Tag,
  Users,
  CreditCard,
  BarChart2,
  Settings,
  LogOut,
  ChevronUp,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// ─── Nav config ──────────────────────────────────────────

const navMain = [
  {
    label: "Utama",
    items: [
      {
        title: "Overview",
        url: "/studio",
        icon: LayoutDashboard,
        exact: true,
      },
    ],
  },
  {
    label: "Konten",
    items: [
      {
        title: "Courses",
        url: "/studio/courses",
        icon: BookOpen,
        badge: "4",
      },
      {
        title: "Artikel",
        url: "/studio/articles",
        icon: FileText,
      },
      {
        title: "Ujian",
        url: "/studio/exams",
        icon: ClipboardList,
      },
      {
        title: "Kategori",
        url: "/studio/categories",
        icon: Tag,
      },
    ],
  },
  {
    label: "Manajemen",
    items: [
      {
        title: "Users",
        url: "/studio/users",
        icon: Users,
        badge: "8",
      },
      {
        title: "Pembayaran",
        url: "/studio/payments",
        icon: CreditCard,
      },
      {
        title: "Analitik",
        url: "/studio/analytics",
        icon: BarChart2,
      },
    ],
  },
  {
    label: "Sistem",
    items: [
      {
        title: "Site settings",
        url: "/studio/settings",
        icon: Settings,
      },
    ],
  },
];

// ─── Component ───────────────────────────────────────────

export function AppSidebar() {
  const pathname = usePathname();

  function isActive(url: string, exact = false) {
    if (exact) return pathname === url;
    return pathname.startsWith(url);
  }

  return (
    <Sidebar collapsible="icon">
      {/* ── Header ── */}
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              className="data-[state=open]:bg-sidebar-accent"
            >
              <Link href="/studio">
                {/* Logo mark */}
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground font-bold text-base shrink-0">
                  ر
                </div>
                {/* Logo text — hidden when collapsed */}
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold text-sidebar-foreground">
                    Rabbani
                  </span>
                  <span className="truncate text-xs text-sidebar-foreground/60">
                    Studio Admin
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* ── Content ── */}
      <SidebarContent>
        {navMain.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-sidebar-foreground/40 uppercase tracking-wider text-[10px] font-semibold">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url, item.exact)}
                      tooltip={item.title}
                      className="data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground"
                    >
                      <Link href={item.url}>
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                    {item.badge && (
                      <SidebarMenuBadge className="bg-sidebar-accent text-sidebar-accent-foreground text-[10px]">
                        {item.badge}
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* ── Footer — user menu ── */}
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent"
                >
                  <Avatar className="size-7 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-sidebar-primary text-sidebar-primary-foreground text-xs font-bold">
                      MH
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium text-sidebar-foreground text-xs">
                      Mohamad Habib Z.
                    </span>
                    <span className="truncate text-[11px] text-sidebar-foreground/50">
                      Administrator
                    </span>
                  </div>
                  <ChevronUp className="ml-auto size-4 text-sidebar-foreground/40" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                className="w-56"
                align="start"
              >
                <DropdownMenuItem asChild>
                  <Link href="/studio/settings">
                    <Settings className="mr-2 size-4" />
                    Pengaturan akun
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 size-4" />
                  Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      {/* Rail — hover to expand when collapsed */}
      <SidebarRail />
    </Sidebar>
  );
}
