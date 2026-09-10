"use client";

import dynamic from "next/dynamic";

const ArticleGutenbergInputClient = dynamic(
  () => import("@/components/ArticleGutenbergInputClient"),
  {
    ssr: false,
    loading: () => (
      <div className="article-gutenberg-loading">
        <p>Memuat editor Gutenberg...</p>
      </div>
    ),
  },
);

export default function ArticleGutenbergInput(props) {
  return <ArticleGutenbergInputClient {...props} />;
}
