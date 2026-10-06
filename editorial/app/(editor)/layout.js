import { requireEditorialUser } from "@/lib/editorial";

// The writing workspace shares authentication, but never mounts AppShell.
export default async function EditorLayout({ children }) {
  await requireEditorialUser();
  return <main className="editor-focus-shell">{children}</main>;
}
