"use client";

import { CalendarDays, FileText, Hash, Image as ImageIcon, Plus, Sparkles, Tag } from "lucide-react";

export default function ArticleMetaFields({
  coverImageUrl,
  isAdmin = false,
  notice = null,
  onChange,
  topicOptions = [],
  values,
}) {
  return (
    <section className="article-meta-shell">
      <input name="slug" type="hidden" value={values.slug} />
      <input name="categoryId" type="hidden" value="" />
      <input name="topic" type="hidden" value={values.topicMode === "custom" ? values.customTopic : values.topic} />
      <input name="status" type="hidden" value={values.status} />

      <div className="article-meta-heading">
        <h1 className="article-meta-title">
          <textarea
            name="title"
            placeholder="Untitled"
            rows="1"
            value={values.title}
            onChange={(event) => onChange("title", event.target.value)}
          />
        </h1>
        <div className="article-meta-slug-row">
          <Hash size={14} strokeWidth={2} />
          <span>{values.slug || "untitled"}</span>
        </div>
      </div>

      {notice ? <div className="article-meta-notice">{notice}</div> : null}

      <div className="article-meta-properties">
        <PropertyRow icon={Sparkles} label="Topik">
          <div className="article-meta-topic-stack">
            {values.topicMode === "custom" ? (
              <input
                placeholder="Tulis topik baru"
                value={values.customTopic}
                onChange={(event) => onChange("customTopic", event.target.value)}
              />
            ) : (
              <select
                value={values.topic}
                onChange={(event) => {
                  if (event.target.value === "__new__") {
                    onChange("topicMode", "custom");
                    return;
                  }

                  onChange("topic", event.target.value);
                }}
              >
                <option value="">Pilih topik</option>
                {topicOptions.map((topic) => (
                  <option key={topic} value={topic}>
                    {topic}
                  </option>
                ))}
                <option value="__new__">Tambah topik baru</option>
              </select>
            )}

            <div className="article-meta-topic-actions">
              <button
                className="article-meta-mini-button"
                type="button"
                onClick={() => {
                  if (values.topicMode === "custom") {
                    onChange("topicMode", "select");
                    return;
                  }

                  onChange("topicMode", "custom");
                }}
              >
                <Plus size={14} strokeWidth={2} />
                <span>{values.topicMode === "custom" ? "Pilih dari daftar" : "Topik baru"}</span>
              </button>
            </div>
          </div>
        </PropertyRow>

        <PropertyRow icon={Tag} label="Tag">
          <input
            name="tags"
            placeholder="adab, tafsir, ushul-fiqh"
            value={values.tags}
            onChange={(event) => onChange("tags", event.target.value)}
          />
        </PropertyRow>

        <PropertyRow icon={FileText} label="Ringkasan" multiline>
          <textarea
            name="excerpt"
            placeholder="Ringkasan singkat artikel untuk kartu, SEO, dan daftar artikel."
            rows="3"
            value={values.excerpt}
            onChange={(event) => onChange("excerpt", event.target.value)}
          />
        </PropertyRow>

        <PropertyRow icon={ImageIcon} label="Cover image">
          <input
            name="coverImageUrl"
            placeholder="https://..."
            type="url"
            value={values.coverImageUrl}
            onChange={(event) => onChange("coverImageUrl", event.target.value)}
          />
        </PropertyRow>

        <PropertyRow icon={CalendarDays} label="Status">
          <span className="article-meta-status-text">{getStatusLabel(values.status, isAdmin)}</span>
        </PropertyRow>
      </div>

      {coverImageUrl ? (
        <div className="article-meta-cover-preview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt={values.title || "Cover image"} src={coverImageUrl} />
        </div>
      ) : null}
    </section>
  );
}

function getStatusLabel(status, isAdmin) {
  if (status === "published") {
    return "Terpublikasi";
  }

  if (status === "submitted") {
    return "Terkirim";
  }

  if (status === "rejected") {
    return "Perlu revisi";
  }

  if (status === "archived") {
    return "Diarsipkan";
  }

  return "Draf";
}

function PropertyRow({ children, icon: Icon, label, multiline = false }) {
  return (
    <label className={`article-meta-property${multiline ? " is-multiline" : ""}`}>
      <span className="article-meta-property-label">
        <Icon size={16} strokeWidth={1.8} />
        <span>{label}</span>
      </span>
      <span className="article-meta-property-input">{children}</span>
    </label>
  );
}
