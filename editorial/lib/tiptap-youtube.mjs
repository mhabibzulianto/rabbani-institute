import { Node } from "@tiptap/core";
import { youtubeEmbedUrl } from "../../packages/article-youtube/index.mjs";

export const Youtube = Node.create({
  name: "youtube", group: "block", atom: true, draggable: true,
  addAttributes() {
    return { src: { default: "", rendered: false, parseHTML: element => youtubeEmbedUrl(element.getAttribute("src") || element.querySelector("iframe")?.getAttribute("src")) || "" } };
  },
  parseHTML() {
    return [{ tag: "figure[data-youtube]", getAttrs: element => youtubeEmbedUrl(element.querySelector("iframe")?.getAttribute("src")) ? null : false }, { tag: "iframe[src]", getAttrs: element => youtubeEmbedUrl(element.getAttribute("src")) ? null : false }];
  },
  renderHTML({ node }) {
    const src = youtubeEmbedUrl(node.attrs.src);
    if (!src) return ["p", {}, "Tautan YouTube tidak valid."];
    return ["figure", { "data-youtube": "", class: "writing-youtube" }, ["iframe", { src, title: "Video YouTube", loading: "lazy", allowfullscreen: "", allow: "encrypted-media; picture-in-picture; fullscreen", referrerpolicy: "strict-origin-when-cross-origin" }]];
  },
});
