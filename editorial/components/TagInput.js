"use client";

import { useEffect, useRef, useState } from "react";
import { Cross2Icon } from "@radix-ui/react-icons";
import { MAX_ARTICLE_TAG_LENGTH, MAX_ARTICLE_TAGS, normalizeArticleTag, parseArticleTags, serializeArticleTags } from "@/lib/article-tags.mjs";

export default function TagInput({ value, onChange, disabled = false }) {
  const [tags, setTags] = useState(() => parseArticleTags(value));
  const [draft, setDraft] = useState("");
  const tagsRef = useRef(tags);

  useEffect(() => {
    const next = parseArticleTags(value);
    if (serializeArticleTags(next) !== serializeArticleTags(tagsRef.current)) {
      tagsRef.current = next;
      setTags(next);
    }
  }, [value]);

  function publish(next) {
    tagsRef.current = next;
    setTags(next);
    onChange(serializeArticleTags(next));
  }

  function add(candidate) {
    const tag = normalizeArticleTag(candidate).slice(0, MAX_ARTICLE_TAG_LENGTH);
    if (!tag) return;
    const current = tagsRef.current;
    if (current.length >= MAX_ARTICLE_TAGS || current.includes(tag)) return;
    publish([...current, tag]);
  }

  function commitDraft() {
    add(draft);
    setDraft("");
  }

  function remove(index) {
    publish(tagsRef.current.filter((_, itemIndex) => itemIndex !== index));
  }

  function editLast() {
    const current = tagsRef.current;
    const last = current.at(-1);
    if (!last) return;
    const remaining = current.slice(0, -1);
    tagsRef.current = remaining;
    setTags(remaining);
    setDraft(last);
  }

  function handleChange(event) {
    const nextDraft = event.target.value;
    const parts = nextDraft.split(/[,，]/);
    if (parts.length === 1) {
      setDraft(nextDraft);
      return;
    }
    for (const part of parts.slice(0, -1)) add(part);
    setDraft(parts.at(-1) || "");
  }

  return <span className={`writing-tag-input${disabled ? " is-disabled" : ""}`} onClick={(event) => event.currentTarget.querySelector("input")?.focus()}>
    {tags.map((tag, index) => <span className="writing-tag-pill" key={`${tag}-${index}`}>
      <span>{tag}</span>
      {!disabled && <button type="button" aria-label={`Hapus tag ${tag}`} onClick={(event) => { event.stopPropagation(); remove(index); }}><Cross2Icon aria-hidden="true" /></button>}
    </span>)}
    <input
      type="text"
      value={draft}
      maxLength={1000}
      placeholder={tags.length ? "Tambah tag…" : "Ketik tag, lalu koma"}
      aria-label="Tambahkan tag"
      disabled={disabled || tags.length >= MAX_ARTICLE_TAGS}
      onChange={handleChange}
      onBlur={commitDraft}
      onKeyDown={(event) => {
        if (event.isComposing || event.nativeEvent?.isComposing) return;
        if (event.key === "," || event.key === "Enter") { event.preventDefault(); commitDraft(); }
        else if (event.key === "Backspace" && !draft && tagsRef.current.length) { event.preventDefault(); editLast(); }
      }}
    />
    <span className="writing-tag-count" aria-label={`${tags.length} dari ${MAX_ARTICLE_TAGS} tag`}>{tags.length}/{MAX_ARTICLE_TAGS}</span>
  </span>;
}
