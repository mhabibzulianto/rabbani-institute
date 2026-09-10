"use client";

// src/components/admin/studio-header.tsx
// Requires: npx shadcn@latest add breadcrumb separator button

import { Bell, Search } from "lucide-react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface StudioHeaderProps {
  /** Page title shown in breadcrumb */
  title: string;
}

export function StudioHeader({ title }: StudioHeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur px-4">
      {/* Sidebar toggle + breadcrumb */}
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem className="hidden md:block">
            <BreadcrumbLink
              href="/studio"
              className="text-muted-foreground hover:text-foreground text-sm"
            >
              Studio
            </BreadcrumbLink>
          </BreadcrumbItem>
          {title !== "Overview" && (
            <>
              <BreadcrumbSeparator className="hidden md:block" />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-sm font-medium">
                  {title}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex-1" />

      {/* Search */}
      <div className="relative hidden sm:block">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input
          placeholder="Cari kelas, user, artikel…"
          className="h-8 w-52 pl-8 text-sm bg-muted/50 border-transparent focus-visible:bg-background focus-visible:border-input"
        />
      </div>

      {/* Notification bell */}
      <Button variant="ghost" size="icon" className="relative size-8">
        <Bell className="size-4" />
        <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-destructive" />
        <span className="sr-only">Notifikasi</span>
      </Button>
    </header>
  );
}

export default StudioHeader;
