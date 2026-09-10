"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

function GoogleIcon(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...props}>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.26-.96 2.32-2.04 3.03l3.3 2.56c1.92-1.77 3.04-4.38 3.04-7.48 0-.71-.06-1.38-.18-2H12Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.63-2.42l-3.3-2.56c-.91.61-2.07.98-3.33.98-2.56 0-4.72-1.73-5.49-4.05l-3.41 2.63C4.75 19.86 8.11 22 12 22Z" />
      <path fill="#4A90E2" d="M6.51 13.95A5.97 5.97 0 0 1 6.2 12c0-.68.12-1.34.31-1.95L3.1 7.42A9.95 9.95 0 0 0 2 12c0 1.62.39 3.15 1.1 4.58l3.41-2.63Z" />
      <path fill="#FBBC05" d="M12 5.95c1.47 0 2.79.5 3.83 1.48l2.88-2.88C16.96 2.92 14.7 2 12 2 8.11 2 4.75 4.14 3.1 7.42l3.41 2.63C7.28 7.68 9.44 5.95 12 5.95Z" />
    </svg>
  );
}

function XIcon(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...props}>
      <path
        fill="currentColor"
        d="M18.901 2H22l-6.77 7.737L23.2 22h-6.238l-4.886-7.488L5.522 22H2.421l7.241-8.276L2 2h6.396l4.417 6.81L18.901 2Zm-1.087 18.127h1.717L7.47 3.777H5.628l12.186 16.35Z"
      />
    </svg>
  );
}

function buildOAuthRedirect(next) {
  if (typeof window === "undefined") {
    return undefined;
  }

  const callbackUrl = new URL("/auth/callback", window.location.origin);
  callbackUrl.searchParams.set("next", next || "https://madrasah.rabbaniinstitute.id/beranda");
  return callbackUrl.toString();
}

export default function AuthSocialButtons({
  next = "https://madrasah.rabbaniinstitute.id/beranda",
  onError,
  className = "",
}) {
  const [loadingProvider, setLoadingProvider] = useState("");

  async function handleOAuth(provider) {
    const supabase = createSupabaseBrowserClient();
    setLoadingProvider(provider);

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: buildOAuthRedirect(next),
      },
    });

    if (error) {
      setLoadingProvider("");
      onError?.(error.message || "Gagal memulai login sosial.");
    }
  }

  return (
    <div className={`grid gap-2 sm:grid-cols-2 ${className}`.trim()}>
      <Button
        type="button"
        variant="outline"
        className="justify-center gap-2"
        disabled={loadingProvider === "google"}
        onClick={() => handleOAuth("google")}
      >
        <GoogleIcon className="size-4" />
        {loadingProvider === "google" ? "Menghubungkan..." : "Google"}
      </Button>
      <Button
        type="button"
        variant="outline"
        className="justify-center gap-2"
        disabled={loadingProvider === "x"}
        onClick={() => handleOAuth("x")}
      >
        <XIcon className="size-4" />
        <span className="sr-only">{loadingProvider === "x" ? "Menghubungkan dengan X..." : "Lanjutkan dengan X"}</span>
      </Button>
    </div>
  );
}
