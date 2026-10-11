"use client";
import { useEffect, useRef } from "react";

export default function LandingDialog({ label, onClose, busy = false, wide = false, children }) {
  const ref = useRef(null);
  useEffect(() => { const dialog = ref.current; dialog.showModal(); return () => { if (dialog.open) dialog.close(); }; }, []);
  return <dialog ref={ref} className={`landing-native-dialog ${wide ? "landing-media-dialog" : "landing-add-dialog"}`} aria-label={label} onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>{children}</dialog>;
}
