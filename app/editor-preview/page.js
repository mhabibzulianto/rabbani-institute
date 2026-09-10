import { redirect } from "next/navigation";
import ArticleForm from "@/components/ArticleForm";
import { getDemoArticleRecord } from "@/lib/article-demo";

async function previewSave() {
  "use server";

  redirect("/editor-preview?message=Preview%20lokal%20saja");
}

export default async function EditorPreviewPage({ searchParams }) {
  const params = await searchParams;

  return (
    <main>
      <ArticleForm
        action={previewSave}
        article={getDemoArticleRecord()}
        backHref="/studio/articles"
        isAdmin
        notice={<PreviewNotice message={params?.message} />}
        topics={["Adab belajar", "Tafsir", "Bahasa Arab", "Tazkiyah"]}
      />
    </main>
  );
}

function PreviewNotice({ message }) {
  if (!message) {
    return <p className="notice info">Halaman ini hanya untuk preview lokal editor.</p>;
  }

  return <p className="notice info">{message}</p>;
}

