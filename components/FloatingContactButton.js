"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";

const SESSION_KEY = "rabbani-hide-floating-contact";

export default function FloatingContactButton({ settings }) {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(Boolean(sessionStorage.getItem(SESSION_KEY)));
  }, []);

  const whatsappHref = useMemo(() => {
    const phone = (settings?.floating_whatsapp_number || "").replace(/\D+/g, "");
    const message = settings?.floating_message || "";

    if (!phone) {
      return "";
    }

    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }, [settings]);

  if (user || dismissed || !settings?.floating_enabled || !whatsappHref) {
    return null;
  }

  return (
    <div className="floating-contact-shell">
      <button
        className="floating-contact-close"
        type="button"
        aria-label="Tutup tombol bantuan"
        onClick={() => {
          sessionStorage.setItem(SESSION_KEY, "1");
          setDismissed(true);
        }}
      >
        x
      </button>
      <a className="floating-contact-button" href={whatsappHref} target="_blank" rel="noreferrer">
        <span className="sr-only">{settings.floating_label}</span>
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M20.52 3.48A11.93 11.93 0 0 0 12 0C5.37 0 0 5.37 0 12c0 2.11.55 4.17 1.6 5.98L0 24l6.18-1.62A11.94 11.94 0 0 0 12 24c6.63 0 12-5.37 12-12 0-3.2-1.25-6.22-3.48-8.52zM12 22c-1.85 0-3.66-.5-5.24-1.44l-.38-.22-3.66.96.98-3.58-.24-.38A9.94 9.94 0 0 1 2 12C2 6.48 6.48 2 12 2s10 4.48 10 10-4.48 10-10 10zm5.44-7.47c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.76.96-.93 1.15-.17.2-.34.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.61.13-.13.3-.34.45-.51.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.6-.92-2.2-.24-.57-.49-.5-.67-.5h-.57c-.2 0-.52.07-.79.37-.27.3-1.02 1-1.02 2.44 0 1.44 1.05 2.83 1.2 3.03.15.2 2.07 3.16 5.02 4.43.7.3 1.25.48 1.68.62.7.22 1.34.19 1.85.12.57-.08 1.75-.72 2-1.41.25-.7.25-1.3.17-1.41-.07-.12-.27-.19-.57-.34z"
            fill="#ffffff"
          />
        </svg>
      </a>
    </div>
  );
}
