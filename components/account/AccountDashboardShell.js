import { redirect } from "next/navigation";
import AccountSidebar from "@/components/account/AccountSidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function AccountDashboardShell({ children }) {
  const { user, profile } = await getCurrentUser();

  if (!user) {
    redirect("/");
  }

  return (
    <SidebarProvider>
      <div className="studio-shell flex min-h-screen w-full">
        <AccountSidebar profile={profile} />
        <SidebarInset className="overflow-auto bg-[#f4f7fb]">
          {children}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
