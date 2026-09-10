"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plate, PlateContent, usePlateEditor } from "platejs/react";
import { Editor as SlateEditor, Element as SlateElement, Node, Range, Transforms } from "slate";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ArrowLeft,
  AudioLines,
  Bold,
  ChevronDown,
  Code2,
  Columns2,
  Columns3,
  FileCode2,
  FileText,
  Image as ImageIcon,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Keyboard,
  Link2,
  List,
  ListOrdered,
  LoaderCircle,
  Minus,
  Plus,
  Quote,
  Redo2,
  Send,
  Smile,
  Sparkles,
  Split,
  Strikethrough,
  Subscript,
  Superscript,
  Table2,
  Underline,
  Undo2,
  Video,
} from "lucide-react";
import ArticleMetaFields from "@/components/ArticleMetaFields";
import { formatHarvardCitation, formatInlineCitation, normalizeCitation } from "@/lib/article-citations";
import { getDefaultArticleValue } from "@/lib/gutenberg-content";
import { useAutoSave } from "@/lib/useAutoSave";

const ELEMENTS = {
  paragraph: "p",
  headingOne: "h1",
  headingTwo: "h2",
  headingThree: "h3",
  blockquote: "blockquote",
  ayahQuote: "ayah-quote",
  arabicQuote: "arabic-quote",
  bulletedList: "ul",
  numberedList: "ol",
  listItem: "li",
  table: "table",
  tableRow: "table-row",
  tableCell: "table-cell",
  columnsTwo: "columns-2",
  columnsThree: "columns-3",
  columnItem: "column-item",
  image: "image",
  video: "video",
  audio: "audio",
  document: "document",
};

const AI_ITEMS = [
  "Lanjutkan tulisan",
  "Rapikan gaya bahasa",
  "Ringkas paragraf",
];

const BLOCK_OPTIONS = [
  { label: "Text", value: ELEMENTS.paragraph },
  { label: "Heading 1", value: ELEMENTS.headingOne },
  { label: "Heading 2", value: ELEMENTS.headingTwo },
  { label: "Heading 3", value: ELEMENTS.headingThree },
  { label: "Bulleted list", value: ELEMENTS.bulletedList },
  { label: "Numbered list", value: ELEMENTS.numberedList },
  { label: "Quote", value: ELEMENTS.blockquote },
  { label: "Ayah quote", value: ELEMENTS.ayahQuote },
  { label: "Arabic quote", value: ELEMENTS.arabicQuote },
  { label: "2 columns", value: ELEMENTS.columnsTwo },
  { label: "3 columns", value: ELEMENTS.columnsThree },
];

const INSERT_GROUPS = [
  {
    label: "Blok dasar",
    items: [
      { label: "Text", action: "insert_text" },
      { label: "Heading 1", action: "insert_h1" },
      { label: "Heading 2", action: "insert_h2" },
      { label: "Heading 3", action: "insert_h3" },
      { label: "Quote", action: "insert_quote" },
      { label: "Ayah quote", action: "insert_ayah" },
      { label: "Arabic quote", action: "insert_arabic" },
      { label: "Table", action: "insert_table" },
      { label: "Code", action: "insert_code" },
      { label: "Keyboard input", action: "insert_keyboard" },
      { label: "Divider", action: "insert_divider" },
    ],
  },
  {
    label: "Daftar",
    items: [
      { label: "Daftar angka", action: "insert_numbered" },
      { label: "Daftar poin", action: "insert_bulleted" },
    ],
  },
  {
    label: "Media",
    items: [
      { label: "Gambar", action: "insert_image" },
      { label: "Embed video", action: "insert_embed_video" },
    ],
  },
  {
    label: "Blok lanjutan",
    items: [
      { label: "2 kolom", action: "insert_columns_2" },
      { label: "3 kolom", action: "insert_columns_3" },
      { label: "Persamaan", action: "insert_equation_block" },
    ],
  },
  {
    label: "Dalam baris",
    items: [
      { label: "Link", action: "inline_link" },
      { label: "Tanggal", action: "inline_date" },
      { label: "Footnote", action: "inline_footnote" },
      { label: "Persamaan dalam baris", action: "inline_equation" },
    ],
  },
];

const BULLET_STYLES = [
  { label: "Disc", value: "disc" },
  { label: "Circle", value: "circle" },
  { label: "Square", value: "square" },
];

const NUMBER_STYLES = [
  { label: "Decimal", value: "decimal" },
  { label: "Lower Alpha", value: "lower-alpha" },
  { label: "Lower Roman", value: "lower-roman" },
];

const DEFAULT_CITATION = normalizeCitation();
const EMOJIS = [":)", "<3", "*", "o", "~", "^"];

export default function ArticlePlateInput({
  article = null,
  articleId = null,
  backHref,
  brandHref = "https://www.rabbaniinstitute.id",
  initialValue,
  isAdmin = false,
  name,
  notice = null,
  submitLabel = "Submit",
  topics = [],
}) {
  const seededValue = useMemo(() => normalizeEditorValue(initialValue), [initialValue]);
  const editor = usePlateEditor({
    value: seededValue,
  });

  useEffect(() => {
    if (!editor) {
      return undefined;
    }

    const previousIsVoid = editor.isVoid?.bind(editor);
    editor.isVoid = (element) => isMediaElement(element) || previousIsVoid?.(element) || false;

    return () => {
      editor.isVoid = previousIsVoid;
    };
  }, [editor]);

  const initialTitle = article?.title || "";
  const initialTopic = article?.topic || "";
  const initialCustomTopic = initialTopic && !topics.includes(initialTopic) ? initialTopic : "";

  const [currentArticleId, setCurrentArticleId] = useState(articleId);
  const [value, setValue] = useState(seededValue);
  const [contentRaw, setContentRaw] = useState(JSON.stringify(seededValue));
  const [meta, setMeta] = useState({
    title: initialTitle,
    slug: toSlug(initialTitle || "Untitled"),
    topic: initialCustomTopic ? "" : initialTopic,
    customTopic: initialCustomTopic,
    topicMode: initialCustomTopic ? "custom" : "select",
    tags: Array.isArray(article?.tags) ? article.tags.join(", ") : article?.tags || "",
    excerpt: article?.excerpt || "",
    coverImageUrl: article?.cover_image_url || "",
    status: article?.status || "draft",
  });
  const [editorIntent, setEditorIntent] = useState("draft");
  const [activeBlockLabel, setActiveBlockLabel] = useState(() => inferBlockLabel(seededValue?.[0]?.type));
  const [openMenu, setOpenMenu] = useState(null);
  const [footnoteOpen, setFootnoteOpen] = useState(false);
  const [citation, setCitation] = useState(DEFAULT_CITATION);
  const [editorNotice, setEditorNotice] = useState("");
  const [metaTrigger, setMetaTrigger] = useState(null);
  const [textTrigger, setTextTrigger] = useState(null);

  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const documentInputRef = useRef(null);
  const intentInputRef = useRef(null);
  const toolbarRef = useRef(null);
  const currentStateRef = useRef(null);
  const metaSeqRef = useRef(0);
  const textSeqRef = useRef(0);

  useEffect(() => {
    currentStateRef.current = {
      articleId: currentArticleId,
      contentRaw,
      meta,
    };
  }, [contentRaw, currentArticleId, meta]);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!toolbarRef.current?.contains(event.target)) {
        setOpenMenu(null);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const stats = useMemo(() => getEditorStats(value), [value]);
  const metaAutosave = useAutoSave({
    delay: 5000,
    enabled: true,
    trigger: metaTrigger,
    onSave: () => autosaveDraft("meta"),
  });
  const textAutosave = useAutoSave({
    delay: 5000,
    enabled: true,
    trigger: textTrigger,
    onSave: () => autosaveDraft("text"),
  });

  function queueMetaAutosave() {
    metaSeqRef.current += 1;
    setMetaTrigger(metaSeqRef.current);
  }

  function queueTextAutosave() {
    textSeqRef.current += 1;
    setTextTrigger(textSeqRef.current);
  }

  function handleMetaChange(field, nextValue) {
    setMeta((current) => {
      const next = {
        ...current,
        [field]: nextValue,
      };

      if (field === "title") {
        next.slug = toSlug(nextValue || "Untitled");
      }

      if (field === "topicMode") {
        if (nextValue === "custom") {
          next.customTopic = current.customTopic || current.topic || "";
        } else if (nextValue === "select") {
          next.customTopic = "";
        }
      }

      return next;
    });
    queueMetaAutosave();
  }

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const titleField = document.querySelector(".article-meta-title textarea");
    if (!titleField) {
      return undefined;
    }

    titleField.style.height = "auto";
    titleField.style.height = `${titleField.scrollHeight}px`;

    return undefined;
  }, [meta.title]);

  function handleValueChange({ value: nextValue }) {
    setValue(nextValue);
    setContentRaw(JSON.stringify(nextValue));
    setActiveBlockLabel(getActiveBlockLabel(editor, nextValue));
    queueTextAutosave();
  }

  async function autosaveDraft(kind) {
    const snapshot = currentStateRef.current;
    const payload = buildAutosavePayload(snapshot, isAdmin);
    const response = await fetch("/api/articles/autosave", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        articleId: snapshot.articleId,
        kind,
        ...payload,
      }),
    });

    if (!response.ok) {
      throw new Error("Autosave failed");
    }

    const result = await response.json();

      if (result?.article?.id && !snapshot.articleId) {
        setCurrentArticleId(result.article.id);
        currentStateRef.current = {
          ...snapshot,
          articleId: result.article.id,
        };

        if (typeof window !== "undefined" && window.location.pathname.endsWith("/new")) {
          const nextPath = window.location.pathname.replace(/\/new$/, `/${result.article.id}/edit`);
          const nextUrl = `${nextPath}${window.location.search || ""}`;
          window.history.replaceState(null, "", nextUrl);
        }
      }

    if (result?.article?.slug && result?.article?.title) {
      setMeta((current) => ({
        ...current,
        title: result.article.title,
        slug: result.article.slug,
      }));
    }
  }

  function runAndClose(callback) {
    if (!editor) {
      return;
    }

    callback(editor);
    setOpenMenu(null);
    queueTextAutosave();
  }

  function toggleMark(mark) {
    runAndClose((activeEditor) => {
      const marks = SlateEditor.marks(activeEditor) || {};
      const isActive = Boolean(marks[mark]);

      if (mark === "subscript") {
        SlateEditor.removeMark(activeEditor, "superscript");
      }

      if (mark === "superscript") {
        SlateEditor.removeMark(activeEditor, "subscript");
      }

      if (isActive) {
        SlateEditor.removeMark(activeEditor, mark);
      } else {
        SlateEditor.addMark(activeEditor, mark, true);
      }
    });
  }

  function setBlockType(type) {
    runAndClose((activeEditor) => {
      if (type === ELEMENTS.bulletedList || type === ELEMENTS.numberedList) {
        toggleList(activeEditor, type);
        setActiveBlockLabel(inferBlockLabel(type));
        return;
      }

      if (type === ELEMENTS.columnsTwo || type === ELEMENTS.columnsThree) {
        insertColumns(activeEditor, type === ELEMENTS.columnsTwo ? 2 : 3);
        setActiveBlockLabel(inferBlockLabel(type));
        return;
      }

      unwrapLists(activeEditor);
      Transforms.setNodes(
        activeEditor,
        { type },
        {
          match: (node) => isBlockElement(node) && !isSpecialContainer(node),
        },
      );
      setActiveBlockLabel(inferBlockLabel(type));
    });
  }

  function setAlignment(align) {
    runAndClose((activeEditor) => {
      Transforms.setNodes(
        activeEditor,
        { align },
        { match: (node) => isBlockElement(node) && !isStructureElement(node) },
      );
    });
  }

  function setListStyle(listStyleType) {
    runAndClose((activeEditor) => {
      Transforms.setNodes(
        activeEditor,
        { listStyleType },
        { match: (node) => isListElement(node) },
      );
    });
  }

  function adjustIndent(amount) {
    runAndClose((activeEditor) => {
      const [match] = SlateEditor.nodes(activeEditor, {
        match: (node) => isBlockElement(node) && !isStructureElement(node),
      });

      if (!match) {
        return;
      }

      const [node, path] = match;
      const nextIndent = Math.max(0, Math.min(6, Number(node.indent || 0) + amount));
      Transforms.setNodes(activeEditor, { indent: nextIndent }, { at: path });
    });
  }

  function handleLink() {
    setOpenMenu(null);

    if (!editor) {
      return;
    }

    const marks = SlateEditor.marks(editor) || {};
    if (marks.linkUrl) {
      SlateEditor.removeMark(editor, "linkUrl");
      SlateEditor.removeMark(editor, "linkTitle");
      queueTextAutosave();
      return;
    }

    const url = window.prompt("Masukkan URL tautan");
    if (!url) {
      return;
    }

    const title = window.prompt("Judul tautan (opsional)") || "";

    if (editor.selection && Range.isExpanded(editor.selection)) {
      SlateEditor.addMark(editor, "linkUrl", url);
      if (title) {
        SlateEditor.addMark(editor, "linkTitle", title);
      }
      queueTextAutosave();
      return;
    }

    const label = window.prompt("Teks tautan", url) || url;
    Transforms.insertNodes(editor, [
      {
        text: label,
        linkUrl: url,
        linkTitle: title,
      },
    ]);
    queueTextAutosave();
  }

  function handleTableInsert() {
    runAndClose((activeEditor) => {
      Transforms.insertNodes(activeEditor, createTableNode());
    });
  }

  function handleEmojiInsert(emoji) {
    runAndClose((activeEditor) => {
      Transforms.insertText(activeEditor, emoji);
    });
  }

  function handleAiPlaceholder(label) {
    setOpenMenu(null);
    setEditorNotice(`${label} akan aktif saat AI editor disambungkan.`);
  }

  function openFootnoteDialog() {
    setOpenMenu(null);
    setCitation(DEFAULT_CITATION);
    setFootnoteOpen(true);
  }

  function submitFootnote(event) {
    event.preventDefault();
    setFootnoteOpen(false);

    if (!editor) {
      return;
    }

    const nextIndex = countFootnotes(value) + 1;
    const footnoteCitation = {
      ...normalizeCitation(citation),
      id: `fn-${nextIndex}`,
      number: nextIndex,
    };

    Transforms.insertNodes(editor, [
      {
        text: `[${nextIndex}]`,
        superscript: true,
        footnoteCitation,
      },
    ]);
    queueTextAutosave();
  }

  function triggerUpload(ref) {
    setOpenMenu(null);
    ref.current?.click();
  }

  async function handleFileSelection(kind, event) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !editor) {
      return;
    }

    const src = await readFileAsDataUrl(file);

    runAndClose((activeEditor) => {
      Transforms.insertNodes(activeEditor, createMediaNode(kind, file, src));
    });
  }

  function handleInsertAction(action) {
    switch (action) {
      case "insert_text":
        insertSimpleBlock(ELEMENTS.paragraph);
        break;
      case "insert_h1":
        insertSimpleBlock(ELEMENTS.headingOne);
        break;
      case "insert_h2":
        insertSimpleBlock(ELEMENTS.headingTwo);
        break;
      case "insert_h3":
        insertSimpleBlock(ELEMENTS.headingThree);
        break;
      case "insert_quote":
        insertSimpleBlock(ELEMENTS.blockquote);
        break;
      case "insert_ayah":
        insertSimpleBlock(ELEMENTS.ayahQuote);
        break;
      case "insert_arabic":
        insertSimpleBlock(ELEMENTS.arabicQuote);
        break;
      case "insert_table":
        handleTableInsert();
        break;
      case "insert_code":
        insertMarkedParagraph("Kode baru", "code");
        break;
      case "insert_keyboard":
        insertMarkedParagraph("Ctrl + K", "kbd");
        break;
      case "insert_divider":
        insertSimpleParagraph("---");
        break;
      case "insert_numbered":
        insertListBlock(ELEMENTS.numberedList);
        break;
      case "insert_bulleted":
        insertListBlock(ELEMENTS.bulletedList);
        break;
      case "insert_image":
        triggerUpload(imageInputRef);
        break;
      case "insert_embed_video":
        insertEmbedVideo();
        break;
      case "insert_columns_2":
        setBlockType(ELEMENTS.columnsTwo);
        break;
      case "insert_columns_3":
        setBlockType(ELEMENTS.columnsThree);
        break;
      case "insert_equation_block":
        insertSimpleParagraph("$$ persamaan $$");
        break;
      case "inline_link":
        handleLink();
        break;
      case "inline_date":
        insertInlineText(new Date().toLocaleDateString("id-ID"));
        break;
      case "inline_footnote":
        openFootnoteDialog();
        break;
      case "inline_equation":
        insertInlineText("$x^2$");
        break;
      default:
        setOpenMenu(null);
    }
  }

  function insertInlineText(text) {
    runAndClose((activeEditor) => {
      Transforms.insertText(activeEditor, text);
    });
  }

  function insertSimpleParagraph(text) {
    runAndClose((activeEditor) => {
      Transforms.insertNodes(activeEditor, {
        type: ELEMENTS.paragraph,
        children: [{ text }],
      });
    });
  }

  function insertMarkedParagraph(text, mark) {
    runAndClose((activeEditor) => {
      Transforms.insertNodes(activeEditor, {
        type: ELEMENTS.paragraph,
        children: [{ text, [mark]: true }],
      });
    });
  }

  function insertSimpleBlock(type) {
    runAndClose((activeEditor) => {
      Transforms.insertNodes(activeEditor, {
        type,
        children: [{ text: "" }],
      });
      setActiveBlockLabel(inferBlockLabel(type));
    });
  }

  function insertListBlock(type) {
    runAndClose((activeEditor) => {
      Transforms.insertNodes(activeEditor, {
        type,
        listStyleType: type === ELEMENTS.numberedList ? "decimal" : "disc",
        children: [{ type: ELEMENTS.listItem, children: [{ text: "" }] }],
      });
      setActiveBlockLabel(inferBlockLabel(type));
    });
  }

  function toggleListFromToolbar(type) {
    runAndClose((activeEditor) => {
      toggleList(activeEditor, type);
      setActiveBlockLabel(inferBlockLabel(type));
    });
  }

  function insertEmbedVideo() {
    const url = window.prompt("Masukkan URL video");
    if (!url || !editor) {
      return;
    }

    runAndClose((activeEditor) => {
      Transforms.insertNodes(activeEditor, {
        type: ELEMENTS.video,
        filename: "Embedded video",
        mimeType: "video/embed",
        src: url,
        children: [{ text: "" }],
      });
    });
  }

  return (
    <div className="rabbani-editor-shell">
      <input name={name} type="hidden" value={contentRaw} />
      <input name="editorIntent" ref={intentInputRef} type="hidden" value={editorIntent} />
      {currentArticleId ? <input name="articleId" type="hidden" value={currentArticleId} /> : null}

      <div className="rabbani-editor-sticky" ref={toolbarRef}>
        <div className="rabbani-editor-topbar">
          <div className="rabbani-editor-topbar-left">
            <SavePill metaState={metaAutosave.saveState} textState={textAutosave.saveState} />
          </div>

          <div className="rabbani-editor-topbar-brand">
            <Link className="rabbani-editor-brand-link" href={brandHref} target="_blank">
              <span className="rabbani-editor-brand-mark">
                <Image
                  alt="Rabbani Institute"
                  height={28}
                  src="/images/rabbani-logo.jpg"
                  width={28}
                />
              </span>
              <span>rabbani-institute</span>
            </Link>
          </div>

          <div className="rabbani-editor-topbar-actions">
            <Link className="rabbani-editor-ghost-button" href={backHref}>
              <ArrowLeft size={16} strokeWidth={2} />
              <span>Kembali</span>
            </Link>
            <button
              className="rabbani-editor-primary-button"
              type="submit"
              onClick={() => {
                const nextIntent = isAdmin ? "published" : "submitted";
                setEditorIntent(nextIntent);
                setMeta((current) => ({
                  ...current,
                  status: isAdmin ? "published" : "submitted",
                }));
                if (intentInputRef.current) {
                  intentInputRef.current.value = nextIntent;
                }
              }}
            >
              <Send size={16} strokeWidth={2} />
              <span>{submitLabel}</span>
            </button>
          </div>
        </div>

        <div className="rabbani-editor-toolbar">
          <div className="rabbani-editor-toolbar-scroll">
            <ToolbarGroup>
              <ToolbarIconButton icon={Undo2} label="Undo" onClick={() => editor?.tf.undo?.()} />
              <ToolbarIconButton icon={Redo2} label="Redo" onClick={() => editor?.tf.redo?.()} />
            </ToolbarGroup>

            <ToolbarGroup>
              <ToolbarDropdown
                icon={Sparkles}
                isOpen={openMenu === "ai"}
                label="AI"
                onToggle={() => toggleMenu(openMenu, setOpenMenu, "ai")}
              >
                {AI_ITEMS.map((item) => (
                  <ToolbarMenuButton key={item} label={item} onClick={() => handleAiPlaceholder(item)} />
                ))}
              </ToolbarDropdown>
            </ToolbarGroup>

            <ToolbarGroup>
              <ToolbarDropdown
                icon={Plus}
                iconOnly
                isOpen={openMenu === "insert"}
                label="Insert"
                onToggle={() => toggleMenu(openMenu, setOpenMenu, "insert")}
              >
                {INSERT_GROUPS.map((group) => (
                  <ToolbarMenuGroup key={group.label} label={group.label}>
                    {group.items.map((item) => (
                      <ToolbarMenuButton key={item.action} label={item.label} onClick={() => handleInsertAction(item.action)} />
                    ))}
                  </ToolbarMenuGroup>
                ))}
              </ToolbarDropdown>

              <ToolbarDropdown
                isOpen={openMenu === "block"}
                label={activeBlockLabel}
                onToggle={() => toggleMenu(openMenu, setOpenMenu, "block")}
              >
                {BLOCK_OPTIONS.map((option) => (
                  <ToolbarMenuButton
                    key={option.value}
                    label={option.label}
                    onClick={() => setBlockType(option.value)}
                  />
                ))}
              </ToolbarDropdown>
            </ToolbarGroup>

            <ToolbarGroup>
              <ToolbarIconButton active={isMarkActive(editor, "bold")} icon={Bold} label="Bold" onClick={() => toggleMark("bold")} />
              <ToolbarIconButton active={isMarkActive(editor, "italic")} icon={Italic} label="Italic" onClick={() => toggleMark("italic")} />
              <ToolbarIconButton active={isMarkActive(editor, "underline")} icon={Underline} label="Underline" onClick={() => toggleMark("underline")} />
              <ToolbarIconButton active={isMarkActive(editor, "strikethrough")} icon={Strikethrough} label="Strikethrough" onClick={() => toggleMark("strikethrough")} />
              <ToolbarIconButton active={isMarkActive(editor, "subscript")} icon={Subscript} label="Subscript" onClick={() => toggleMark("subscript")} />
              <ToolbarIconButton active={isMarkActive(editor, "superscript")} icon={Superscript} label="Superscript" onClick={() => toggleMark("superscript")} />
              <ToolbarIconButton active={isMarkActive(editor, "code")} icon={Code2} label="Code" onClick={() => toggleMark("code")} />
              <ToolbarIconButton active={isMarkActive(editor, "kbd")} icon={Keyboard} label="Keyboard input" onClick={() => toggleMark("kbd")} />
            </ToolbarGroup>

            <ToolbarGroup>
              <ToolbarDropdown
                icon={AlignLeft}
                iconOnly
                isOpen={openMenu === "align"}
                label="Align"
                onToggle={() => toggleMenu(openMenu, setOpenMenu, "align")}
              >
                <ToolbarMenuButton icon={AlignLeft} label="Left" onClick={() => setAlignment("left")} />
                <ToolbarMenuButton icon={AlignCenter} label="Center" onClick={() => setAlignment("center")} />
                <ToolbarMenuButton icon={AlignRight} label="Right" onClick={() => setAlignment("right")} />
                <ToolbarMenuButton icon={AlignJustify} label="Justify" onClick={() => setAlignment("justify")} />
              </ToolbarDropdown>

              <ToolbarSplitDropdown
                icon={List}
                isOpen={openMenu === "bullets"}
                label="Bullets"
                onPrimaryClick={() => toggleListFromToolbar(ELEMENTS.bulletedList)}
                onToggle={() => toggleMenu(openMenu, setOpenMenu, "bullets")}
              >
                {BULLET_STYLES.map((option) => (
                  <ToolbarMenuButton key={option.value} label={option.label} onClick={() => setListStyle(option.value)} />
                ))}
              </ToolbarSplitDropdown>

              <ToolbarSplitDropdown
                icon={ListOrdered}
                isOpen={openMenu === "numbers"}
                label="Numbers"
                onPrimaryClick={() => toggleListFromToolbar(ELEMENTS.numberedList)}
                onToggle={() => toggleMenu(openMenu, setOpenMenu, "numbers")}
              >
                {NUMBER_STYLES.map((option) => (
                  <ToolbarMenuButton key={option.value} label={option.label} onClick={() => setListStyle(option.value)} />
                ))}
              </ToolbarSplitDropdown>
            </ToolbarGroup>

            <ToolbarGroup>
              <ToolbarIconButton icon={Link2} label="Link" onClick={handleLink} />
              <ToolbarIconButton icon={Table2} label="Table" onClick={handleTableInsert} />

              <ToolbarDropdown
                icon={Smile}
                iconOnly
                isOpen={openMenu === "emoji"}
                label="Emoji"
                onToggle={() => toggleMenu(openMenu, setOpenMenu, "emoji")}
              >
                {EMOJIS.map((emoji) => (
                  <ToolbarMenuButton key={emoji} label={emoji} onClick={() => handleEmojiInsert(emoji)} />
                ))}
              </ToolbarDropdown>

              <ToolbarIconButton icon={FileText} label="Footnote" onClick={openFootnoteDialog} />
            </ToolbarGroup>

            <ToolbarGroup>
              <ToolbarIconButton icon={ImageIcon} label="Upload image" onClick={() => triggerUpload(imageInputRef)} />
              <ToolbarIconButton icon={Video} label="Upload video" onClick={() => triggerUpload(videoInputRef)} />
              <ToolbarIconButton icon={AudioLines} label="Upload audio" onClick={() => triggerUpload(audioInputRef)} />
              <ToolbarIconButton icon={FileCode2} label="Upload document" onClick={() => triggerUpload(documentInputRef)} />
            </ToolbarGroup>

            <ToolbarGroup>
              <ToolbarIconButton icon={IndentDecrease} label="Outdent" onClick={() => adjustIndent(-1)} />
              <ToolbarIconButton icon={IndentIncrease} label="Indent" onClick={() => adjustIndent(1)} />
            </ToolbarGroup>
          </div>
        </div>
      </div>

      <div className="rabbani-editor-page">
        <div className="rabbani-editor-page-inner">
          <ArticleMetaFields
            coverImageUrl={meta.coverImageUrl}
            isAdmin={isAdmin}
            notice={notice}
            onChange={handleMetaChange}
            topicOptions={topics}
            values={meta}
          />

          {editorNotice ? <p className="rabbani-editor-notice">{editorNotice}</p> : null}

          <div className="rabbani-editor-canvas">
            <Plate editor={editor} onValueChange={handleValueChange}>
              <PlateContent
                aria-label="Rabbani article editor"
                className="rabbani-editor-content editor-scroll"
                placeholder="Mulai menulis artikel di sini..."
                renderElement={EditableElement}
                renderLeaf={EditableLeaf}
              />
            </Plate>
          </div>
        </div>
      </div>

      <footer className="rabbani-editor-footer">
        <span>{stats.words} kata</span>
        <span>{stats.characters} karakter</span>
        <span>{stats.readingTime} menit baca</span>
      </footer>

      <input accept="image/*" hidden ref={imageInputRef} type="file" onChange={(event) => handleFileSelection("image", event)} />
      <input accept="video/*" hidden ref={videoInputRef} type="file" onChange={(event) => handleFileSelection("video", event)} />
      <input accept="audio/*" hidden ref={audioInputRef} type="file" onChange={(event) => handleFileSelection("audio", event)} />
      <input accept=".pdf,.doc,.docx,.ppt,.pptx" hidden ref={documentInputRef} type="file" onChange={(event) => handleFileSelection("document", event)} />

      {footnoteOpen ? (
        <FootnoteDialog
          citation={citation}
          onCancel={() => setFootnoteOpen(false)}
          onChange={setCitation}
          onSubmit={submitFootnote}
        />
      ) : null}
    </div>
  );
}

function SavePill({ metaState, textState }) {
  if (metaState === "on" && textState === "on") {
    return (
      <div className="rabbani-editor-save-pill">
        <Sparkles size={14} strokeWidth={1.9} />
        <span>Autosave: on</span>
      </div>
    );
  }

  return (
    <div className="rabbani-editor-save-pill">
      {(metaState === "saving" || textState === "saving")
        ? <LoaderCircle className="spin" size={14} strokeWidth={1.9} />
        : <Sparkles size={14} strokeWidth={1.9} />}
      <span>{`Meta: ${statusLabel(metaState)} | Teks: ${statusLabel(textState)}`}</span>
    </div>
  );
}

function statusLabel(state) {
  if (state === "saving") {
    return "Menyimpan...";
  }
  if (state === "error") {
    return "Gagal";
  }
  if (state === "saved") {
    return "Tersimpan";
  }
  return "Autosave: on";
}

function ToolbarGroup({ children }) {
  return <div className="rabbani-toolbar-group">{children}</div>;
}

function ToolbarIconButton({ active = false, icon: Icon, label, onClick }) {
  return (
    <button
      className={`rabbani-toolbar-icon-button${active ? " is-active" : ""}`}
      title={label}
      type="button"
      onMouseDown={preventToolbarBlur}
      onClick={onClick}
    >
      <Icon size={16} strokeWidth={2} />
    </button>
  );
}

function ToolbarDropdown({ children, icon: Icon, iconOnly = false, isOpen, label, onToggle }) {
  return (
    <div className="rabbani-toolbar-dropdown">
      <button
        aria-expanded={isOpen}
        className={`rabbani-toolbar-dropdown-trigger${iconOnly ? " is-icon-only" : ""}${isOpen ? " is-active" : ""}`}
        type="button"
        onMouseDown={preventToolbarBlur}
        onClick={onToggle}
      >
        {Icon ? <Icon size={15} strokeWidth={2} /> : null}
        {iconOnly ? null : <span>{label}</span>}
        <ChevronDown className="rabbani-toolbar-dropdown-chevron" size={14} strokeWidth={2} />
      </button>
      {isOpen ? <div className="rabbani-toolbar-menu">{children}</div> : null}
    </div>
  );
}

function ToolbarSplitDropdown({ children, icon: Icon, isOpen, label, onPrimaryClick, onToggle }) {
  return (
    <div className="rabbani-toolbar-split-dropdown">
      <button
        className={`rabbani-toolbar-icon-button${isOpen ? " is-active" : ""}`}
        title={label}
        type="button"
        onMouseDown={preventToolbarBlur}
        onClick={onPrimaryClick}
      >
        <Icon size={16} strokeWidth={2} />
      </button>
      <button
        aria-expanded={isOpen}
        className={`rabbani-toolbar-split-toggle${isOpen ? " is-active" : ""}`}
        title={`${label} options`}
        type="button"
        onMouseDown={preventToolbarBlur}
        onClick={onToggle}
      >
        <ChevronDown size={14} strokeWidth={2} />
      </button>
      {isOpen ? <div className="rabbani-toolbar-menu">{children}</div> : null}
    </div>
  );
}

function ToolbarMenuGroup({ children, label }) {
  return (
    <div className="rabbani-toolbar-menu-group">
      <p className="rabbani-toolbar-menu-group-label">{label}</p>
      {children}
    </div>
  );
}

function ToolbarMenuButton({ icon: Icon, label, onClick }) {
  return (
    <button
      className="rabbani-toolbar-menu-button"
      type="button"
      onMouseDown={preventToolbarBlur}
      onClick={onClick}
    >
      {Icon ? <Icon size={15} strokeWidth={2} /> : null}
      <span>{label}</span>
    </button>
  );
}

function FootnoteDialog({ citation, onCancel, onChange, onSubmit }) {
  const preview = formatHarvardCitation(citation);

  return (
    <div className="rabbani-editor-modal-backdrop" role="presentation">
      <div aria-modal="true" className="rabbani-editor-modal" role="dialog">
        <div className="rabbani-editor-modal-head">
          <div>
            <h2>Footnote & citation</h2>
            <p>Tambahkan catatan kaki beserta sumber dalam format Harvard.</p>
          </div>
          <button className="rabbani-editor-modal-close" type="button" onClick={onCancel}>
            <Minus size={18} strokeWidth={2} />
          </button>
        </div>

        <form className="rabbani-editor-modal-form" onSubmit={onSubmit}>
          <div className="rabbani-editor-field-grid">
            <Field label="Jenis sumber">
              <select value={citation.sourceType} onChange={(event) => onChange({ ...citation, sourceType: event.target.value })}>
                <option value="book">Buku</option>
                <option value="journal">Jurnal</option>
                <option value="website">Website</option>
                <option value="thesis">Tesis</option>
                <option value="other">Lainnya</option>
              </select>
            </Field>

            <Field label="Nama penulis">
              <input value={citation.author} onChange={(event) => onChange({ ...citation, author: event.target.value })} />
            </Field>

            <Field label="Tahun">
              <input value={citation.year} onChange={(event) => onChange({ ...citation, year: event.target.value })} />
            </Field>

            <Field label="Judul">
              <input value={citation.title} onChange={(event) => onChange({ ...citation, title: event.target.value })} />
            </Field>

            <Field label={citation.sourceType === "journal" ? "Nama jurnal" : "Publikasi"}>
              <input
                value={citation.sourceType === "journal" ? citation.journal : citation.publication}
                onChange={(event) => onChange({
                  ...citation,
                  journal: citation.sourceType === "journal" ? event.target.value : citation.journal,
                  publication: citation.sourceType === "journal" ? citation.publication : event.target.value,
                })}
              />
            </Field>

            <Field label="Penerbit / institusi">
              <input
                value={citation.sourceType === "thesis" ? citation.institution : citation.publisher}
                onChange={(event) => onChange({
                  ...citation,
                  institution: citation.sourceType === "thesis" ? event.target.value : citation.institution,
                  publisher: citation.sourceType === "thesis" ? citation.publisher : event.target.value,
                })}
              />
            </Field>

            <Field label="Kota / lokasi">
              <input value={citation.place} onChange={(event) => onChange({ ...citation, place: event.target.value })} />
            </Field>

            <Field label="Volume">
              <input value={citation.volume} onChange={(event) => onChange({ ...citation, volume: event.target.value })} />
            </Field>

            <Field label="Issue">
              <input value={citation.issue} onChange={(event) => onChange({ ...citation, issue: event.target.value })} />
            </Field>

            <Field label="Halaman">
              <input value={citation.page} onChange={(event) => onChange({ ...citation, page: event.target.value })} />
            </Field>

            <Field label="URL">
              <input type="url" value={citation.url} onChange={(event) => onChange({ ...citation, url: event.target.value })} />
            </Field>

            <Field label="Tanggal akses">
              <input value={citation.accessedAt} onChange={(event) => onChange({ ...citation, accessedAt: event.target.value })} />
            </Field>
          </div>

          <Field label="Catatan">
            <textarea rows="3" value={citation.note} onChange={(event) => onChange({ ...citation, note: event.target.value })} />
          </Field>

          <div className="rabbani-editor-citation-preview">
            <strong>Preview</strong>
            <p>{formatInlineCitation(citation)}</p>
            <p>{preview || "Sumber akan muncul di sini."}</p>
          </div>

          <div className="rabbani-editor-modal-actions">
            <button className="rabbani-editor-ghost-button" type="button" onClick={onCancel}>
              Batal
            </button>
            <button className="rabbani-editor-primary-button" type="submit">
              Sisipkan footnote
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ children, label }) {
  return (
    <label className="rabbani-editor-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function EditableElement({ attributes, children, element }) {
  const style = {
    textAlign: element.align || undefined,
    marginInlineStart: `${Number(element.indent || 0) * 1.5}rem`,
  };

  switch (element.type) {
    case "h1":
      return <h1 {...attributes} style={style}>{children}</h1>;
    case "h2":
      return <h2 {...attributes} style={style}>{children}</h2>;
    case "h3":
      return <h3 {...attributes} style={style}>{children}</h3>;
    case "blockquote":
      return <blockquote {...attributes} style={style}>{children}</blockquote>;
    case "ayah-quote":
      return <blockquote {...attributes} className="ayah-quote" style={style}>{children}</blockquote>;
    case "arabic-quote":
      return <blockquote {...attributes} className="arabic-quote" style={style}>{children}</blockquote>;
    case "ul":
      return <ul {...attributes} style={{ ...style, listStyleType: element.listStyleType || "disc" }}>{children}</ul>;
    case "ol":
      return <ol {...attributes} style={{ ...style, listStyleType: element.listStyleType || "decimal" }}>{children}</ol>;
    case "li":
      return <li {...attributes}>{children}</li>;
    case "columns-2":
    case "columns-3":
      return (
        <div
          {...attributes}
          className={`article-columns ${element.type === "columns-3" ? "is-three" : "is-two"}`}
        >
          {children}
        </div>
      );
    case "column-item":
      return <div {...attributes} className="article-column-item">{children}</div>;
    case "table":
      return (
        <div {...attributes} className="article-table-wrap">
          <table className="article-table">
            <tbody>{children}</tbody>
          </table>
        </div>
      );
    case "table-row":
      return <tr {...attributes}>{children}</tr>;
    case "table-cell":
      return <td {...attributes}>{children}</td>;
    case "image":
      return (
        <div {...attributes} contentEditable={false}>
          <figure className="article-image-block">
            <div className="article-image-shell">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt={element.alt || element.filename || "Image"} src={element.src} />
            </div>
            {element.filename ? <figcaption>{element.filename}</figcaption> : null}
          </figure>
          {children}
        </div>
      );
    case "video":
      return (
        <div {...attributes} contentEditable={false}>
          <figure className="article-media-block">
            <video controls src={element.src} />
            {element.filename ? <figcaption>{element.filename}</figcaption> : null}
          </figure>
          {children}
        </div>
      );
    case "audio":
      return (
        <div {...attributes} contentEditable={false}>
          <figure className="article-media-block">
            <audio controls src={element.src} />
            {element.filename ? <figcaption>{element.filename}</figcaption> : null}
          </figure>
          {children}
        </div>
      );
    case "document":
      return (
        <div {...attributes} contentEditable={false}>
          <div className="article-document-block">
            <strong>{element.filename || "Dokumen artikel"}</strong>
            <a href={element.src} rel="noreferrer" target="_blank">
              Buka dokumen
            </a>
          </div>
          {children}
        </div>
      );
    case "p":
    default:
      return <p {...attributes} style={style}>{children}</p>;
  }
}

function EditableLeaf({ attributes, children, leaf }) {
  let content = children;

  if (leaf.linkUrl) {
    content = (
      <a href={leaf.linkUrl} rel="noreferrer" target="_blank" title={leaf.linkTitle || leaf.linkUrl}>
        {content}
      </a>
    );
  }
  if (leaf.kbd) {
    content = <kbd>{content}</kbd>;
  }
  if (leaf.code) {
    content = <code>{content}</code>;
  }
  if (leaf.bold) {
    content = <strong>{content}</strong>;
  }
  if (leaf.italic) {
    content = <em>{content}</em>;
  }
  if (leaf.underline) {
    content = <u>{content}</u>;
  }
  if (leaf.strikethrough) {
    content = <s>{content}</s>;
  }
  if (leaf.subscript) {
    content = <sub>{content}</sub>;
  }
  if (leaf.superscript) {
    content = <sup>{content}</sup>;
  }

  return <span {...attributes}>{content}</span>;
}

function normalizeEditorValue(initialValue) {
  const value = Array.isArray(initialValue) ? initialValue : getDefaultArticleValue();
  return value.length ? value : getDefaultArticleValue();
}

function inferBlockLabel(type) {
  const match = BLOCK_OPTIONS.find((option) => option.value === type);
  return match?.label || "Text";
}

function getActiveBlockLabel(editor, value) {
  if (editor?.selection) {
    const [match] = SlateEditor.nodes(editor, {
      match: (node) => isBlockElement(node),
    });

    if (match?.[0]?.type) {
      return inferBlockLabel(match[0].type);
    }
  }

  return inferBlockLabel(value?.[0]?.type);
}

function preventToolbarBlur(event) {
  event.preventDefault();
}

function isMarkActive(editor, mark) {
  const marks = SlateEditor.marks(editor) || {};
  return Boolean(marks[mark]);
}

function toggleMenu(openMenu, setOpenMenu, name) {
  setOpenMenu((current) => (current === name ? null : name));
}

function toggleList(editor, type) {
  const isActive = isBlockActive(editor, type);

  unwrapLists(editor);

  Transforms.setNodes(
    editor,
    { type: isActive ? ELEMENTS.paragraph : ELEMENTS.listItem },
    {
      match: (node) => isBlockElement(node) && !isListElement(node),
    },
  );

  if (!isActive) {
    Transforms.wrapNodes(
      editor,
      {
        type,
        listStyleType: type === ELEMENTS.numberedList ? "decimal" : "disc",
        children: [],
      },
      {
        match: (node) => isListItemElement(node),
      },
    );
  }
}

function unwrapLists(editor) {
  Transforms.unwrapNodes(editor, {
    match: (node) => isListElement(node),
    split: true,
  });
}

function isBlockActive(editor, type) {
  const [match] = SlateEditor.nodes(editor, {
    match: (node) => isBlockElement(node) && node.type === type,
  });

  return Boolean(match);
}

function isBlockElement(node) {
  return !SlateEditor.isEditor(node) && SlateElement.isElement(node);
}

function isListElement(node) {
  return isBlockElement(node) && [ELEMENTS.bulletedList, ELEMENTS.numberedList].includes(node.type);
}

function isListItemElement(node) {
  return isBlockElement(node) && node.type === ELEMENTS.listItem;
}

function isStructureElement(node) {
  return isBlockElement(node) && [ELEMENTS.tableRow, ELEMENTS.tableCell, ELEMENTS.columnItem].includes(node.type);
}

function isSpecialContainer(node) {
  return isBlockElement(node) && [ELEMENTS.table, ELEMENTS.tableRow, ELEMENTS.tableCell, ELEMENTS.columnsTwo, ELEMENTS.columnsThree, ELEMENTS.columnItem].includes(node.type);
}

function isMediaElement(node) {
  return isBlockElement(node) && [ELEMENTS.image, ELEMENTS.video, ELEMENTS.audio, ELEMENTS.document].includes(node.type);
}

function createTableNode() {
  return {
    type: ELEMENTS.table,
    children: [0, 1].map(() => ({
      type: ELEMENTS.tableRow,
      children: [0, 1].map(() => ({
        type: ELEMENTS.tableCell,
        children: [{ type: ELEMENTS.paragraph, children: [{ text: "" }] }],
      })),
    })),
  };
}

function insertColumns(editor, count) {
  Transforms.insertNodes(editor, {
    type: count === 3 ? ELEMENTS.columnsThree : ELEMENTS.columnsTwo,
    children: Array.from({ length: count }).map(() => ({
      type: ELEMENTS.columnItem,
      children: [{ type: ELEMENTS.paragraph, children: [{ text: "" }] }],
    })),
  });
}

function createMediaNode(kind, file, src) {
  const type = kind === "image"
    ? ELEMENTS.image
    : kind === "video"
      ? ELEMENTS.video
      : kind === "audio"
        ? ELEMENTS.audio
        : ELEMENTS.document;

  return {
    type,
    filename: file.name,
    mimeType: file.type,
    src,
    alt: file.name,
    children: [{ text: "" }],
  };
}

async function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result?.toString() || ""));
    reader.addEventListener("error", () => reject(new Error("Gagal membaca file.")));
    reader.readAsDataURL(file);
  });
}

function getEditorStats(value) {
  const text = (Array.isArray(value) ? value : [])
    .map((node) => Node.string(node))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  const words = text ? text.split(" ").filter(Boolean).length : 0;
  const characters = text.length;
  const readingTime = Math.max(1, Math.ceil(words / 200));

  return {
    words,
    characters,
    readingTime,
  };
}

function countFootnotes(value) {
  let total = 0;

  for (const node of value || []) {
    total += countFootnotesInNode(node);
  }

  return total;
}

function countFootnotesInNode(node) {
  if (!node || typeof node !== "object") {
    return 0;
  }

  if (node.footnoteCitation) {
    return 1;
  }

  if (Array.isArray(node.children)) {
    return node.children.reduce((sum, child) => sum + countFootnotesInNode(child), 0);
  }

  return 0;
}

function buildAutosavePayload(snapshot, isAdmin) {
  const title = `${snapshot.meta.title || ""}`.trim() || "Untitled";
  const slug = toSlug(title);
  const topic = snapshot.meta.topicMode === "custom"
    ? `${snapshot.meta.customTopic || ""}`.trim()
    : `${snapshot.meta.topic || ""}`.trim();

  return {
    title,
    slug,
    topic,
    tags: `${snapshot.meta.tags || ""}`
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    excerpt: `${snapshot.meta.excerpt || ""}`.trim() || null,
    coverImageUrl: `${snapshot.meta.coverImageUrl || ""}`.trim() || null,
    status: snapshot.meta.status || "draft",
    contentRaw: snapshot.contentRaw,
  };
}

function toSlug(value) {
  return (value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "untitled";
}
