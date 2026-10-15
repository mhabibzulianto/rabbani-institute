// Nama surah mengikuti Pedoman Transliterasi Rabbani Institute. Urutan array
// sama dengan nomor surah; indeks 0 sengaja dikosongkan.
export const QURAN_CHAPTER_NAMES = [
  null,
  "al-Fātiḥah", "al-Baqarah", "Āli 'Imrān", "an-Nisā'", "al-Mā'idah", "al-An'ām", "al-A'rāf", "al-Anfāl", "at-Tawbah",
  "Yūnus", "Hūd", "Yūsuf", "ar-Ra'd", "Ibrāhīm", "al-Ḥijr", "an-Naḥl", "al-Isrā'", "al-Kahf", "Maryam",
  "Ṭāhā", "al-Anbiyā'", "al-Ḥajj", "al-Mu'minūn", "an-Nūr", "al-Furqān", "asy-Syu'arā'", "an-Naml", "al-Qaṣaṣ", "al-'Ankabūt",
  "ar-Rūm", "Luqmān", "as-Sajdah", "al-Aḥzāb", "Saba'", "Fāṭir", "Yāsīn", "aṣ-Ṣāffāt", "Ṣād", "az-Zumar",
  "Ghāfir", "Fuṣṣilat", "asy-Syūrā", "az-Zukhruf", "ad-Dukhān", "al-Jātsiyah", "al-Aḥqāf", "Muhammad", "al-Fatḥ", "al-Ḥujurāt",
  "Qāf", "adz-Dzāriyāt", "aṭ-Ṭūr", "an-Najm", "al-Qamar", "ar-Raḥmān", "al-Wāqi'ah", "al-Ḥadīd", "al-Mujādilah", "al-Ḥasyr",
  "al-Mumtaḥanah", "aṣ-Ṣaff", "al-Jumu'ah", "al-Munāfiqūn", "at-Taghābun", "aṭ-Ṭalāq", "at-Taḥrīm", "al-Mulk", "al-Qalam", "al-Ḥāqqah",
  "al-Ma'ārij", "Nūḥ", "al-Jinn", "al-Muzzammil", "al-Muddatstsir", "al-Qiyāmah", "al-Insān", "al-Mursalāt", "an-Naba'", "an-Nāzi'āt",
  "'Abasa", "at-Takwīr", "al-Infiṭār", "al-Muṭaffifīn", "al-Insyiqāq", "al-Burūj", "aṭ-Ṭāriq", "al-A'lā", "al-Ghāsyiyah", "al-Fajr",
  "al-Balad", "asy-Syams", "al-Layl", "aḍ-Ḍuḥā", "asy-Syarḥ", "at-Tīn", "al-'Alaq", "al-Qadr", "al-Bayyinah", "az-Zalzalah",
  "al-'Ādiyāt", "al-Qāri'ah", "at-Takātsur", "al-'Aṣr", "al-Humazah", "al-Fīl", "Quraysy", "al-Mā'ūn", "al-Kawtsar", "al-Kāfirūn",
  "an-Naṣr", "al-Masad", "al-Ikhlāṣ", "al-Falaq", "an-Nās",
];

export function quranChapterName(chapter) {
  return QURAN_CHAPTER_NAMES[Number(chapter?.id)] || chapter?.name || "";
}
