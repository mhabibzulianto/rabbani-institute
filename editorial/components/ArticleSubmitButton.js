"use client";

import { useFormStatus } from "react-dom";

export default function ArticleSubmitButton() {
  const { pending } = useFormStatus();
  return <button type="submit" className="primary-button" disabled={pending}>{pending ? "Membuat draft…" : "Buat draft"}</button>;
}
