import { requireEditorialUser } from "@/lib/editorial";

// Chromium can resize the layout with the keyboard, keeping fixed writing tools
// visible. VisualViewport positioning covers browsers that ignore this option.
export const viewport = { width: "device-width", initialScale: 1, interactiveWidget: "resizes-content" };

// The writing workspace shares authentication, but never mounts AppShell.
export default async function EditorLayout({ children }) {
  await requireEditorialUser();
  return <main className="editor-focus-shell">{children}</main>;
}
