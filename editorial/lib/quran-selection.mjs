export const MAX_QURAN_VERSES = 20;
export function validateQuranRange(chapter, from, to) {
  const start = Number(from), end = Number(to);
  if (!chapter || !Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start || end > chapter.verses) throw new Error("Pilih nomor ayat yang valid, dengan ayat akhir setelah atau sama dengan ayat awal.");
  if (end - start + 1 > MAX_QURAN_VERSES) throw new Error("Maksimal 20 ayat dalam satu penyisipan.");
  return { from: start, to: end };
}
// Preserve the source verse exactly, including harakat and intervening stop signs.
export function normalizeQuranVerse(verse, chapter, number) {
  if (verse?.verse_key !== chapter + ":" + number || verse.verse_number !== number || typeof verse.text_uthmani !== "string" || !verse.text_uthmani.trim() || verse.text_uthmani.length > 20000 || !Array.isArray(verse.words)) throw new Error("Data ayat dari sumber belum valid. Coba lagi.");
  const words = verse.words.filter(word => word.char_type_name === "word");
  if (!words.length || words.length > 1000) throw new Error("Data kata ayat tidak tersedia.");
  // Word data includes some recitation marks absent from the verse field.
  // Align on annotation-free tokens, but display and slice the original verse.
  const annotations = /[\u06d6-\u06ed]/gu;
  const tokens = [...verse.text_uthmani.matchAll(/\S+/gu)].filter(match => match[0].replace(annotations, ""));
  if (tokens.length !== words.length) throw new Error("Pembagian kata tidak sesuai dengan teks ayat dari sumber.");
  const mapped = words.map((word, index) => {
    const token = tokens[index];
    if (word.position !== index + 1 || typeof word.text_uthmani !== "string" || !word.text_uthmani || token[0].replace(annotations, "") !== word.text_uthmani.replace(annotations, "").trim()) throw new Error("Urutan kata tidak sesuai dengan teks ayat dari sumber.");
    return { position: index + 1, text: token[0], start: token.index };
  });
  return { number, key: verse.verse_key, text: verse.text_uthmani, words: mapped.map((word, index) => ({ ...word, end: mapped[index + 1]?.start ?? verse.text_uthmani.length })) };
}
export function quranSelection(chapter, verses, partial = false, startWord = 1, endWord = verses.at(-1)?.words.length) {
  if (!verses.length) throw new Error("Tampilkan ayat terlebih dahulu.");
  validateQuranRange(chapter, verses[0].number, verses.at(-1).number);
  if (verses.some((verse, index) => verse.number !== verses[0].number + index)) throw new Error("Rentang ayat belum lengkap.");
  const first = verses[0], last = verses.at(-1);
  if (partial && (!Number.isInteger(startWord) || !Number.isInteger(endWord) || startWord < 1 || startWord > first.words.length || endWord < 1 || endWord > last.words.length || (first === last && startWord > endWord))) throw new Error("Pilih kata awal dan kata akhir yang valid.");
  const cropped = partial && (startWord > 1 || endWord < last.words.length);
  const texts = verses.map((verse, index) => {
    const start = partial && index === 0 ? verse.words[startWord - 1].start : 0;
    const end = partial && index === verses.length - 1 ? verse.words[endWord - 1].end : verse.text.length;
    return (start > 0 ? "… " : "") + verse.text.slice(start, end).trim() + (end < verse.text.length ? " …" : "") + " ﴿" + String(verse.number).replace(/\d/g, digit => "٠١٢٣٤٥٦٧٨٩"[Number(digit)]) + "﴾";
  });
  const reference = "QS. " + chapter.name + " [" + chapter.id + "]: " + first.number + (first.number !== last.number ? "–" + last.number : "") + (cropped ? " (potongan ayat)" : "");
  return { texts, reference, cropped, content: [
    { type: "arabicBlock", content: texts.map(text => ({ type: "paragraph", content: [{ type: "text", text }] })) },
    { type: "paragraph", attrs: { textAlign: "left" }, content: [{ type: "text", text: reference, marks: [{ type: "italic" }] }] },
    { type: "paragraph" },
  ] };
}
