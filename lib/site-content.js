import { platformUrls } from "@/lib/platform-urls";

export const faqItems = [
  {
    question: "Bagaimana cara mendaftar kelas di Rabbani Institute?",
    answer:
      "Buka halaman detail kelas, lalu pilih daftar gratis atau bayar dan daftar. Untuk kelas berbayar, sistem akan mengarahkan ke alur pembayaran yang tersedia sebelum akses belajar dibuka.",
  },
  {
    question: "Apakah saya bisa mendaftar memakai WhatsApp?",
    answer:
      "Bisa. Saat membuat akun, pilih metode WhatsApp lalu verifikasi pendaftaran memakai OTP yang dikirim ke nomor aktif kamu.",
  },
  {
    question: "Bagaimana jika saya lupa password akun?",
    answer:
      "Gunakan halaman lupa password. Kamu bisa reset lewat email atau lewat OTP WhatsApp, sesuai metode akun yang pernah dipakai saat mendaftar.",
  },
  {
    question: "Apa perbedaan Kelas Mandiri dan Kelas Madrasah?",
    answer:
      "Kelas Mandiri bisa langsung dimulai setelah terdaftar. Kelas Madrasah mengikuti jadwal pendaftaran dan jadwal kelas yang sudah ditentukan, baik synchronous maupun asynchronous.",
  },
  {
    question: "Bagaimana cara mengikuti ujian susulan?",
    answer:
      "Buka modul ujian yang tersedia, masukkan nomor WhatsApp yang valid, verifikasi OTP, lalu mulai attempt sesuai jadwal dan batas percobaan yang ditentukan.",
  },
  {
    question: "Apakah materi kelas bisa diunduh?",
    answer:
      "Beberapa kelas menyediakan dokumen utama dan reading assignment yang bisa dibuka atau diunduh langsung dari halaman belajar, tergantung pengaturan pengajar.",
  },
];

export const searchablePages = [
  {
    title: "Beranda",
    url: "/",
    type: "Halaman",
    excerpt: "Pintu masuk utama untuk kelas, ujian, artikel, dan informasi platform Rabbani Institute.",
    content: "beranda rabbani institute belajar islam bahasa arab kelas ujian artikel pembayaran",
  },
  {
    title: "Kelas",
    url: platformUrls.classesHome,
    type: "Halaman",
    excerpt: "Daftar seluruh kelas mandiri dan kelas madrasah yang sedang tersedia.",
    content: "kelas daftar kelas mandiri kelas madrasah course belajar islam bahasa arab",
  },
  {
    title: "Artikel",
    url: platformUrls.articleHome,
    type: "Halaman",
    excerpt: "Kumpulan tulisan pembelajaran Islam, Bahasa Arab, dan refleksi belajar.",
    content: "artikel tulisan pembelajaran islam bahasa arab kajian refleksi",
  },
  {
    title: "FAQ",
    url: "/faq",
    type: "FAQ",
    excerpt: "Jawaban cepat untuk pertanyaan umum tentang akun, kelas, ujian, dan pembayaran.",
    content: faqItems.map((item) => `${item.question} ${item.answer}`).join(" "),
  },
  {
    title: "Tentang Kami",
    url: "/tentang-kami",
    type: "Halaman",
    excerpt: "Arah, nilai, dan fokus pembelajaran Rabbani Institute.",
    content: "tentang kami rabbani institute platform belajar islam bahasa arab nilai pembelajaran",
  },
  {
    title: "Kontak",
    url: "/kontak",
    type: "Halaman",
    excerpt: "Informasi bantuan resmi, kanal komunikasi, dan panduan menghubungi admin.",
    content: "kontak bantuan admin whatsapp email dukungan teknis akademik pembayaran ujian",
  },
  {
    title: "Kebijakan Pengguna",
    url: "/kebijakan-pengguna",
    type: "Kebijakan",
    excerpt: "Aturan penggunaan platform, akun, materi, kelas, dan ujian.",
    content: "kebijakan pengguna aturan akun akses materi ujian kelas platform",
  },
  {
    title: "Kebijakan Privasi",
    url: "/kebijakan-privasi",
    type: "Kebijakan",
    excerpt: "Cara Rabbani Institute mengumpulkan, menyimpan, dan menggunakan data pengguna.",
    content: "kebijakan privasi data pengguna email whatsapp keamanan penyimpanan",
  },
  {
    title: "Kebijakan Pengembalian Dana",
    url: "/kebijakan-pengembalian-dana",
    type: "Kebijakan",
    excerpt: "Ketentuan refund untuk kelas, layanan, dan biaya terkait.",
    content: "kebijakan pengembalian dana refund kelas pembayaran pembatalan biaya",
  },
];
