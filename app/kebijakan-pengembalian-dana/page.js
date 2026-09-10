import PolicyPage from "@/components/PolicyPage";

export const metadata = {
  title: "Kebijakan Pengembalian Dana | rabbani-institute",
  description: "Ketentuan pengajuan refund untuk kelas, layanan, dan modul berbayar di Rabbani Institute.",
};

const sections = [
  {
    heading: "Ruang Lingkup Kebijakan",
    paragraphs: [
      "Kebijakan Pengembalian Dana ini berlaku untuk pembelian kelas, program, atau layanan berbayar yang ditawarkan melalui Rabbani Institute, kecuali jika suatu layanan secara tegas dinyatakan tidak refundable.",
      "Setiap pengajuan refund akan ditinjau berdasarkan jenis layanan, status akses materi, keikutsertaan peserta, dan bukti transaksi yang tersedia.",
    ],
  },
  {
    heading: "Kelas Mandiri",
    paragraphs: [
      "Untuk Kelas Mandiri, pengembalian dana pada prinsipnya hanya dapat dipertimbangkan apabila peserta belum mengakses materi secara signifikan dan pengajuan dilakukan dalam jangka waktu yang wajar setelah pembayaran.",
    ],
    items: [
      "Pengajuan refund idealnya dilakukan paling lambat 3 hari sejak pembayaran berhasil.",
      "Jika materi telah diakses secara luas, progress sudah berjalan, atau sebagian besar konten telah dibuka, pengembalian dana dapat ditolak.",
      "Keputusan akhir mempertimbangkan data akses aktual pada akun peserta.",
    ],
  },
  {
    heading: "Kelas Madrasah",
    paragraphs: [
      "Untuk Kelas Madrasah yang memiliki jadwal belajar, pengembalian dana dapat dipertimbangkan apabila diajukan sebelum kelas dimulai atau apabila penyelenggaraan dibatalkan oleh Rabbani Institute.",
    ],
    items: [
      "Jika kelas belum dimulai, peserta dapat mengajukan refund sesuai ketentuan yang berlaku pada program tersebut.",
      "Jika kelas sudah berjalan atau peserta telah mengikuti sesi, permintaan refund dapat ditolak atau disesuaikan secara proporsional.",
      "Jika pembatalan datang dari pihak penyelenggara, peserta berhak menerima refund penuh atau pemindahan ke kelas lain yang setara.",
    ],
  },
  {
    heading: "Modul Ujian dan Biaya Khusus",
    paragraphs: [
      "Biaya untuk modul ujian, biaya administratif, atau layanan khusus pada prinsipnya tidak dapat dikembalikan apabila peserta sudah menerima akses, OTP, atau kesempatan attempt sesuai ketentuan modul tersebut.",
      "Refund untuk modul ujian hanya dipertimbangkan jika terjadi gangguan sistem yang signifikan, kesalahan dari penyelenggara, atau pembatalan dari pihak Rabbani Institute.",
    ],
  },
  {
    heading: "Kondisi yang Tidak Memenuhi Refund",
    paragraphs: [
      "Rabbani Institute dapat menolak pengajuan refund jika ditemukan kondisi berikut.",
    ],
    items: [
      "Peserta telah mengakses sebagian besar materi atau menggunakan layanan secara substansial.",
      "Peserta telah mengikuti sesi kelas, mengerjakan ujian, atau memakai attempt yang diberikan.",
      "Pengajuan dilakukan di luar batas waktu yang ditetapkan.",
      "Terdapat pelanggaran Kebijakan Pengguna, kecurangan, atau penyalahgunaan layanan.",
    ],
  },
  {
    heading: "Cara Mengajukan Pengembalian Dana",
    paragraphs: [
      "Permintaan refund diajukan kepada admin Rabbani Institute melalui kanal resmi yang disediakan.",
      "Untuk mempercepat verifikasi, pengguna sebaiknya menyiapkan informasi berikut.",
    ],
    items: [
      "Nama lengkap dan email akun yang digunakan.",
      "Nama kelas atau layanan yang dibeli.",
      "Alasan pengajuan refund.",
      "Bukti pembayaran atau informasi transaksi apabila diminta.",
    ],
  },
  {
    heading: "Proses Peninjauan dan Pembayaran Kembali",
    paragraphs: [
      "Setiap pengajuan akan diperiksa berdasarkan data transaksi, data akses, dan aturan program yang berlaku.",
      "Jika refund disetujui, pengembalian dana akan diproses melalui metode pembayaran awal atau metode lain yang disepakati, dalam estimasi waktu 7 sampai 14 hari kerja tergantung kanal pembayaran.",
    ],
  },
  {
    heading: "Biaya Administratif dan Potongan",
    paragraphs: [
      "Dalam kondisi tertentu, biaya administrasi atau biaya payment gateway yang tidak dapat dipulihkan dapat menjadi pengurang nilai refund.",
      "Jika ada potongan yang berlaku, informasi tersebut akan dijelaskan kepada pengguna saat proses peninjauan refund berlangsung.",
    ],
  },
  {
    heading: "Keputusan Akhir",
    paragraphs: [
      "Keputusan refund ditetapkan berdasarkan verifikasi internal Rabbani Institute dengan mempertimbangkan data yang tercatat pada sistem, status layanan, serta kebijakan yang berlaku saat transaksi dilakukan.",
      "Rabbani Institute berupaya menangani setiap pengajuan secara adil, proporsional, dan transparan.",
    ],
  },
  {
    heading: "Perubahan Kebijakan",
    paragraphs: [
      "Kebijakan Pengembalian Dana ini dapat diperbarui sewaktu-waktu untuk menyesuaikan model layanan, metode pembayaran, dan kebutuhan operasional Rabbani Institute.",
      "Versi terbaru akan dipublikasikan di website ini dan berlaku sejak tanggal penayangan.",
    ],
  },
];

export default function RefundPolicyPage() {
  return (
    <PolicyPage
      pretitle="Kebijakan Pengembalian Dana"
      title="Ketentuan refund untuk kelas dan layanan Rabbani Institute"
      intro="Halaman ini menjelaskan kapan pengembalian dana dapat diajukan, kapan pengajuan dapat ditolak, dan bagaimana proses refund ditangani di Rabbani Institute."
      sections={sections}
    />
  );
}
