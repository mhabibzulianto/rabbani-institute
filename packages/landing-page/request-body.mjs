// Bound bytes while reading, including requests without Content-Length.
export async function readLandingBody(request, limit = 1024) {
  if (Number(request.headers.get("content-length") || 0) > limit) throw new RangeError("Request too large");
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new RangeError("Request too large"); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}
