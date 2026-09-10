"use client";

import "@wordpress/components/build-style/style.css";
import "@wordpress/block-editor/build-style/style.css";
import "@wordpress/block-library/build-style/style.css";
import "@wordpress/block-library/build-style/editor.css";
import { useMemo, useState } from "react";
import { Button, DropZoneProvider, Popover, SlotFillProvider } from "@wordpress/components";
import {
  BlockEditorKeyboardShortcuts,
  BlockEditorProvider,
  BlockList,
  BlockTools,
  DefaultBlockAppender,
  Inserter,
  ObserveTyping,
  WritingFlow,
} from "@wordpress/block-editor";
import { getBlockTypes, parse, serialize, unregisterBlockType } from "@wordpress/blocks";
import { registerCoreBlocks } from "@wordpress/block-library";
import { ALLOWED_ARTICLE_BLOCKS, normalizeArticleRaw } from "@/lib/gutenberg-content";

let hasRegisteredArticleBlocks = false;

function ensureArticleBlocksRegistered() {
  if (hasRegisteredArticleBlocks) {
    return;
  }

  registerCoreBlocks();

  for (const blockType of getBlockTypes()) {
    if (blockType?.name && !ALLOWED_ARTICLE_BLOCKS.includes(blockType.name)) {
      unregisterBlockType(blockType.name);
    }
  }

  hasRegisteredArticleBlocks = true;
}

export default function ArticleGutenbergInputClient({ name, initialRaw }) {
  ensureArticleBlocksRegistered();

  const initialValue = useMemo(() => {
    try {
      return parse(normalizeArticleRaw(initialRaw));
    } catch {
      return parse(normalizeArticleRaw(""));
    }
  }, [initialRaw]);
  const [blocks, setBlocks] = useState(initialValue);
  const [contentRaw, setContentRaw] = useState(() => serialize(initialValue));

  const settings = useMemo(() => ({
    hasFixedToolbar: true,
    focusMode: false,
    codeEditingEnabled: false,
    allowedBlockTypes: ALLOWED_ARTICLE_BLOCKS,
    templateLock: false,
  }), []);

  function handleBlocksChange(nextBlocks) {
    setBlocks(nextBlocks);
    setContentRaw(serialize(nextBlocks));
  }

  return (
    <div className="article-gutenberg-field">
      <input type="hidden" name={name} value={contentRaw} />

      <SlotFillProvider>
        <DropZoneProvider>
          <BlockEditorProvider
            onChange={handleBlocksChange}
            onInput={handleBlocksChange}
            settings={settings}
            value={blocks}
          >
            <div className="article-gutenberg-shell">
              <div className="article-gutenberg-toolbar">
                <div className="article-gutenberg-toolbar-group">
                  <Inserter
                    isAppender={false}
                    rootClientId={null}
                    renderToggle={({ disabled, onToggle }) => (
                      <Button
                        className="article-gutenberg-inserter"
                        disabled={disabled}
                        onClick={onToggle}
                        variant="secondary"
                      >
                        Tambah blok
                      </Button>
                    )}
                  />
                </div>
                <p className="article-gutenberg-note">
                  Blok yang diizinkan: paragraph, heading, quote, list, dan separator.
                </p>
              </div>

              <BlockEditorKeyboardShortcuts.Register />
              <BlockTools>
                <div className="article-gutenberg-canvas">
                  <WritingFlow>
                    <ObserveTyping>
                      <BlockList renderAppender={DefaultBlockAppender} />
                    </ObserveTyping>
                  </WritingFlow>
                </div>
              </BlockTools>
              <Popover.Slot />
            </div>
          </BlockEditorProvider>
        </DropZoneProvider>
      </SlotFillProvider>
    </div>
  );
}
