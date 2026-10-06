import { Node, mergeAttributes } from "@tiptap/core";

export const mediaKinds = ["image", "video", "audio", "document"];
export function mediaExtensions() {
  return mediaKinds.map((kind) => Node.create({
    name: kind, group: "block", atom: true, draggable: true,
    addAttributes() {
      return Object.fromEntries(["src", "alt", "caption", "filename"].map((name) => [name, {
        default: "",
        parseHTML: (element) => name === "caption" ? element.querySelector("figcaption")?.textContent || "" : name === "filename" ? element.getAttribute("data-filename") || "" : element.getAttribute(name) || element.querySelector("img,video,audio,a")?.getAttribute(name === "src" && kind === "document" ? "href" : name) || (name === "src" ? element.querySelector("source")?.getAttribute("src") : "") || "",
        rendered: false,
      }]));
    },
    parseHTML() { return [{ tag: `figure[data-media="${kind}"]` }, ...(kind !== "document" ? [{ tag: "figure", getAttrs: (element) => element.querySelector(kind === "image" ? "img" : kind) ? null : false }, { tag: kind === "image" ? "img[src]" : kind }] : [])]; },
    renderHTML({ node, HTMLAttributes }) {
      const { src, alt, caption, filename } = node.attrs;
      const body = kind === "image" ? ["img", { src, alt, loading: "lazy" }]
        : kind === "document" ? ["a", { href: src, target: "_blank", rel: "noopener noreferrer" }, filename || "Buka dokumen PDF"]
        : [kind, { src, controls: "", preload: "metadata" }];
      return ["figure", mergeAttributes(HTMLAttributes, { "data-media": kind, "data-filename": filename, class: "writing-media" }), body, ...(caption ? [["figcaption", {}, caption]] : [])];
    },
  }));
}
