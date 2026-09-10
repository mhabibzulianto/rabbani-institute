import PolicyPage from "@/components/PolicyPage";

export const metadata = {
  title: "Kebijakan Pengguna | rabbani-institute",
  description: "Ketentuan penggunaan platform, akun, materi, dan ujian di Rabbani Institute.",
};

const sections = [
  {
    heading: "Persetujuan Penggunaan",
    paragraphs: [
      "Dengan mengakses atau menggunakan platform Rabbani Institute, Anda dianggap telah membaca, memahami, dan menyetujui Kebijakan Pengguna ini.",
      "Kebijakan ini berlaku untuk seluruh layanan Rabbani Institute, termasuk kelas mandiri, kelas madrasah, modul ujian, pembayaran, dan fitur pendukung lainnya.",
    ],
  },
  {
    heading: "Kelayakan dan Keakuratan Data",
    paragraphs: [
      "Pengguna wajib memberikan data yang benar, mutakhir, dan dapat dipertanggungjawabkan ketika membuat akun atau menggunakan layanan Rabbani Institute.",
    ],
    items: [
      "Satu akun ditujukan untuk satu pengguna.",
      "Pengguna bertanggung jawab menjaga keamanan email, password, OTP, dan akses perangkat yang dipakai untuk masuk ke platform.",
      "Rabbani Institute berhak meminta pembaruan data jika ditemukan ketidaksesuaian atau dugaan penyalahgunaan.",
    ],
  },
  {
    heading: "Aturan Penggunaan Akun",
    paragraphs: [
      "Akun tidak boleh dibagikan, dipinjamkan, diperjualbelikan, atau dialihkan tanpa izin tertulis dari Rabbani Institute.",
    ],
    items: [
      "Pengguna tidak boleh menggunakan akun orang lain tanpa izin yang sah.",
      "Pengguna tidak boleh mencoba mengakses area admin, data peserta lain, atau fitur yang tidak diberikan kepada perannya.",
      "Rabbani Institute dapat menangguhkan akun yang terindikasi dipakai bersama, diakses secara tidak wajar, atau melanggar kebijakan keamanan.",
    ],
  },
  {
    heading: "Hak Akses terhadap Materi",
    paragraphs: [
      "Seluruh video, teks, soal, rekaman, handout, dan materi pembelajaran lain di Rabbani Institute disediakan untuk penggunaan pribadi dalam rangka belajar.",
    ],
    items: [
      "Dilarang merekam ulang, mengunggah ulang, mendistribusikan, menjual, menyalin massal, atau menyebarkan materi tanpa izin tertulis.",
      "Akses materi dapat dibatasi oleh model kelas, periode belajar, status pembayaran, atau aturan akademik yang berlaku.",
      "Akses ke kelas atau ujian dapat dicabut jika ditemukan pelanggaran hak cipta atau penyalahgunaan layanan.",
    ],
  },
  {
    heading: "Perilaku yang Dilarang",
    paragraphs: [
      "Rabbani Institute menjaga lingkungan belajar yang aman, tertib, dan bermanfaat. Karena itu, beberapa perilaku dilarang keras.",
    ],
    items: [
      "Kecurangan akademik, termasuk berbagi jawaban ujian, menggunakan identitas orang lain, atau memanipulasi attempt.",
      "Spam, pelecehan, provokasi, penghinaan, atau bentuk gangguan lain terhadap admin, pengajar, atau peserta.",
      "Upaya merusak sistem, mencoba bypass pembayaran, mengganggu integrasi, scraping tanpa izin, atau eksploitasi teknis lainnya.",
    ],
  },
  {
    heading: "Aturan Ujian dan Evaluasi",
    paragraphs: [
      "Pengguna wajib mengikuti aturan teknis dan akademik yang ditetapkan untuk setiap modul ujian, termasuk penggunaan OTP WhatsApp, timer, batas attempt, dan jadwal ujian.",
    ],
    items: [
      "Hanya peserta yang berhak yang boleh mengikuti ujian sesuai whitelist, jadwal, dan ketentuan modul.",
      "Rabbani Institute berhak membatalkan hasil ujian jika ditemukan pelanggaran integritas akademik atau penyalahgunaan sistem.",
      "Admin berhak meninjau attempt, waktu pengerjaan, dan pola jawaban untuk kepentingan verifikasi.",
    ],
  },
  {
    heading: "Perubahan Layanan",
    paragraphs: [
      "Rabbani Institute dapat melakukan perubahan pada kurikulum, jadwal, pengajar, struktur kelas, fitur sistem, atau tata cara layanan apabila diperlukan untuk peningkatan kualitas dan keberlangsungan operasional.",
    "Perubahan yang bersifat material akan diumumkan melalui website, studio, atau kanal komunikasi resmi yang digunakan platform.",
    ],
  },
  {
    heading: "Penangguhan dan Pengakhiran Akses",
    paragraphs: [
      "Rabbani Institute berhak menangguhkan, membatasi, atau menghentikan akses pengguna apabila ditemukan pelanggaran kebijakan, penyalahgunaan layanan, atau situasi lain yang membahayakan sistem dan peserta lain.",
      "Langkah ini dapat dilakukan tanpa pemberitahuan sebelumnya jika dibutuhkan untuk perlindungan sistem, materi, atau keamanan pengguna lain.",
    ],
  },
  {
    heading: "Batas Tanggung Jawab",
    paragraphs: [
      "Rabbani Institute berupaya menjaga layanan tetap stabil, aman, dan dapat diakses. Namun, tidak ada jaminan bahwa layanan akan selalu bebas dari gangguan, keterlambatan, atau kendala teknis dari pihak ketiga.",
      "Pengguna memahami bahwa sebagian fungsi platform dapat bergantung pada penyedia eksternal seperti hosting, pembayaran, autentikasi, atau pengiriman pesan.",
    ],
  },
  {
    heading: "Kontak dan Perubahan Kebijakan",
    paragraphs: [
      "Kebijakan Pengguna ini dapat diperbarui sewaktu-waktu untuk menyesuaikan perkembangan layanan Rabbani Institute.",
      "Versi terbaru akan dipublikasikan di website ini dan berlaku sejak tanggal ditayangkan. Untuk pertanyaan lebih lanjut, pengguna dapat menghubungi admin Rabbani Institute melalui kanal resmi yang tersedia.",
    ],
  },
];

export default function UserPolicyPage() {
  return (
    <PolicyPage
      pretitle="Kebijakan Pengguna"
      title="Aturan penggunaan platform Rabbani Institute"
      intro="Halaman ini menjelaskan ketentuan umum penggunaan akun, akses materi, integritas ujian, dan perilaku yang diharapkan dari seluruh pengguna Rabbani Institute."
      sections={sections}
    />
  );
}
