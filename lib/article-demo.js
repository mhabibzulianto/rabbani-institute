export function getDemoArticleValue() {
  return [
    {
      type: "h1",
      children: [{ text: "Membaca dengan hati yang tenang" }],
    },
    {
      type: "p",
      children: [
        { text: "Editor ini dirancang untuk artikel Rabbani Institute dengan toolbar yang lebih halus, ruang baca yang lega, dan blok khusus untuk kutipan Arab, media, tabel, serta catatan kaki." },
      ],
    },
    {
      type: "ayah-quote",
      children: [{ text: "وَقُلْ رَبِّ زِدْنِي عِلْمًا" }],
    },
    {
      type: "arabic-quote",
      children: [{ text: "اللغة العربية مفتاح لفهم النصوص وفهم العلم على مهل." }],
    },
    {
      type: "columns-2",
      children: [
        {
          type: "column-item",
          children: [
            {
              type: "p",
              children: [{ text: "Kolom kiri cocok untuk definisi inti, ayat, atau terjemah singkat." }],
            },
          ],
        },
        {
          type: "column-item",
          children: [
            {
              type: "p",
              children: [{ text: "Kolom kanan bisa dipakai untuk penjelasan, faedah, atau rujukan tambahan." }],
            },
          ],
        },
      ],
    },
    {
      type: "blockquote",
      children: [{ text: "Menulis artikel yang baik bukan soal cepat, tapi soal jernih, tertib, dan enak dibaca." }],
    },
    {
      type: "ul",
      listStyleType: "disc",
      children: [
        { type: "li", children: [{ text: "Heading 1-3" }] },
        { type: "li", children: [{ text: "Arabic quote dan ayah quote" }] },
        { type: "li", children: [{ text: "Footnote dengan format Harvard" }] },
      ],
    },
    {
      type: "p",
      children: [
        { text: "Untuk rujukan dasar tentang adab menuntut ilmu, lihat " },
        {
          text: "[1]",
          superscript: true,
          footnoteCitation: {
            id: "fn-1",
            number: 1,
            sourceType: "book",
            author: "Al-Attas, S.M.N.",
            year: "1980",
            title: "The Concept of Education in Islam",
            publisher: "ABIM",
            place: "Kuala Lumpur",
            page: "12",
          },
        },
        { text: "." },
      ],
    },
    {
      type: "table",
      children: [
        {
          type: "table-row",
          children: [
            { type: "table-cell", children: [{ type: "p", children: [{ text: "Blok" }] }] },
            { type: "table-cell", children: [{ type: "p", children: [{ text: "Kegunaan" }] }] },
          ],
        },
        {
          type: "table-row",
          children: [
            { type: "table-cell", children: [{ type: "p", children: [{ text: "Ayah quote" }] }] },
            { type: "table-cell", children: [{ type: "p", children: [{ text: "Ayat atau nash Arab dengan gaya baca kanan ke kiri." }] }] },
          ],
        },
      ],
    },
  ];
}

export function getDemoArticleRecord() {
  return {
    id: 9999,
    title: "Membaca dengan hati yang tenang",
    slug: "membaca-dengan-hati-yang-tenang",
    excerpt: "Preview lokal untuk editor artikel Rabbani Institute dengan gaya baru yang lebih dekat ke studio penulisan.",
    status: "submitted",
    topic: "Adab belajar",
    tags: ["adab", "bahasa-arab", "tafsir"],
    category_id: null,
    cover_image_url: "https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=1200&q=80",
    content_raw: JSON.stringify(getDemoArticleValue()),
    blocks: getDemoArticleValue(),
  };
}
