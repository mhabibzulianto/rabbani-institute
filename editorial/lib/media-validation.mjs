export const MEDIA_BUCKET = "editorial-media";
export const MEDIA_TYPES = {
  "image/jpeg": ["image", "jpg", 10], "image/png": ["image", "png", 10], "image/webp": ["image", "webp", 10], "image/gif": ["image", "gif", 10],
  "video/mp4": ["video", "mp4", 50], "video/webm": ["video", "webm", 50],
  "audio/mpeg": ["audio", "mp3", 50], "audio/ogg": ["audio", "ogg", 50], "audio/wav": ["audio", "wav", 50], "audio/x-wav": ["audio", "wav", 50],
  "application/pdf": ["document", "pdf", 50],
};
export const MEDIA_ACCEPT = Object.keys(MEDIA_TYPES).join(",");
export const MEDIA_LABELS = { image: "Gambar", video: "Video", audio: "Audio", document: "Dokumen" };
export function safeMediaUrl(value) {
  if (typeof value !== "string" || value.length > 2000 || !/^https?:\/\//i.test(value)) return false;
  try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password; } catch { return false; }
}
export function validateMediaMetadata({ name, type, size, alt = "", caption = "" }) {
  const format = MEDIA_TYPES[type];
  if (!format) throw new Error("Format belum didukung. Gunakan JPG, PNG, WebP, GIF, MP4, WebM, MP3, OGG, WAV, atau PDF.");
  if (!Number.isSafeInteger(size) || size < 1 || size > format[2] * 1024 * 1024) throw new Error(`Ukuran maksimal ${format[2]} MB untuk file ini.`);
  if (typeof name !== "string" || !name.trim() || name.length > 255) throw new Error("Nama file tidak valid.");
  if (typeof alt !== "string" || alt.length > 500 || typeof caption !== "string" || caption.length > 500) throw new Error("Alt text dan caption maksimal 500 karakter.");
  return { name: name.trim(), mime_type: type, size_bytes: size, kind: format[0], extension: format[1], alt: alt.trim(), caption: caption.trim() };
}
export function validateMediaBytes(type, bytes) {
  const text = (start, end) => String.fromCharCode(...bytes.slice(start, end));
  const signatures = {
    "image/jpeg": () => bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255,
    "image/png": () => [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte),
    "image/gif": () => ["GIF87a", "GIF89a"].includes(text(0, 6)),
    "image/webp": () => text(0, 4) === "RIFF" && text(8, 12) === "WEBP",
    "video/mp4": () => text(4, 8) === "ftyp",
    "video/webm": () => [26, 69, 223, 163].every((byte, index) => bytes[index] === byte),
    "audio/mpeg": () => text(0, 3) === "ID3" || (bytes[0] === 255 && (bytes[1] & 224) === 224),
    "audio/ogg": () => text(0, 4) === "OggS",
    "audio/wav": () => text(0, 4) === "RIFF" && text(8, 12) === "WAVE",
    "audio/x-wav": () => text(0, 4) === "RIFF" && text(8, 12) === "WAVE",
    "application/pdf": () => text(0, 5) === "%PDF-",
  };
  if (!signatures[type]?.()) throw new Error("Isi file tidak sesuai dengan formatnya. Pilih file asli dengan format yang didukung.");
}
