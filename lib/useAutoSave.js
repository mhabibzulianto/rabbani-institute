"use client";

import { useEffect, useRef, useState } from "react";

export function useAutoSave({
  delay = 5000,
  enabled = true,
  trigger = null,
  onSave,
}) {
  const timeoutRef = useRef(null);
  const saveRef = useRef(onSave);
  const [saveState, setSaveState] = useState("on");

  useEffect(() => {
    saveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    if (!enabled || trigger === null) {
      return undefined;
    }

    window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(async () => {
      setSaveState("saving");

      try {
        await saveRef.current?.();
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, delay);

    return () => window.clearTimeout(timeoutRef.current);
  }, [delay, enabled, trigger]);

  return {
    saveState,
  };
}
