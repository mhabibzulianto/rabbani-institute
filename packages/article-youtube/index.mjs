// Store a canonical embed URL, never arbitrary iframe HTML or player options.
export function youtubeEmbedUrl(value) {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const raw = value.trim();
    const url = new URL(/^(?:www\.|m\.|music\.)?(?:youtube\.com|youtu\.be|youtube-nocookie\.com)\//i.test(raw) ? `https://${raw}` : raw);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.port) return null;
    const host = url.hostname.toLowerCase();
    const parts = url.pathname.split("/").filter(Boolean);
    let id;
    if (["youtu.be", "www.youtu.be"].includes(host) && parts.length === 1) id = parts[0];
    else if (["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com"].includes(host)) {
      if (url.pathname === "/watch") id = url.searchParams.get("v");
      else if (["embed", "shorts", "live"].includes(parts[0]) && parts.length === 2) id = parts[1];
    } else if (["youtube-nocookie.com", "www.youtube-nocookie.com"].includes(host) && parts[0] === "embed" && parts.length === 2) id = parts[1];
    if (!/^[a-zA-Z0-9_-]{11}$/.test(id || "")) return null;
    const timestamp = url.searchParams.get("start") ?? url.searchParams.get("t") ?? "";
    let start = 0;
    if (/^\d+$/.test(timestamp)) start = Number(timestamp);
    else {
      const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(timestamp);
      if (match) start = Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0);
    }
    if (!Number.isSafeInteger(start) || start < 0 || start > 604800) start = 0;
    return `https://www.youtube-nocookie.com/embed/${id}${start ? `?start=${start}` : ""}`;
  } catch { return null; }
}
