import PolicyPage from "@/components/PolicyPage";
import { getPublicSiteSettings } from "@/lib/site-settings";

export const metadata = {
  title: "Kebijakan Privasi | rabbani-institute",
  description: "Penjelasan mengenai data yang dikumpulkan, dipakai, dan dilindungi oleh Rabbani Institute.",
};

function createSections(contactEmail) {
  return [
    {
      heading: "Komitmen Privasi",
      paragraphs: [
        "Rabbani Institute menghargai privasi setiap pengguna. Kebijakan Privasi ini menjelaskan jenis data yang kami kumpulkan, cara penggunaannya, serta langkah umum yang kami lakukan untuk melindunginya.",
        "Dengan menggunakan platform Rabbani Institute, Anda menyetujui pengumpulan dan penggunaan data sebagaimana dijelaskan dalam kebijakan ini.",
      ],
    },
    {
      heading: "Data yang Kami Kumpulkan",
      paragraphs: [
        "Untuk menjalankan layanan pembelajaran, kami dapat mengumpulkan data yang diberikan langsung oleh pengguna maupun data teknis yang tercatat otomatis selama penggunaan platform.",
      ],
      items: [
        "Nama lengkap, email, tahun lahir, dan informasi akun lain yang diisi saat registrasi.",
        "Nomor WhatsApp yang dipakai untuk OTP, komunikasi akademik, atau verifikasi akses ujian.",
        "Data pembelajaran seperti enrollment, progress, hasil attempt ujian, dan status pembayaran.",
        "Data teknis seperti IP address, jenis perangkat, browser, token sesi, dan log aktivitas sistem.",
      ],
    },
    {
      heading: "Dasar Pemrosesan Data",
      paragraphs: [
        "Kami memproses data pribadi pengguna hanya sejauh diperlukan untuk menjalankan layanan Rabbani Institute, memenuhi kewajiban operasional yang wajar, menjaga keamanan sistem, dan menindaklanjuti permintaan pengguna.",
      ],
      items: [
        "Persetujuan pengguna saat membuat akun, menghubungkan akun Google, atau memakai layanan kami.",
        "Kebutuhan kontraktual untuk menyediakan akses kelas, ujian, pembayaran, dan akun belajar.",
        "Kepentingan yang sah untuk melindungi platform, mencegah penyalahgunaan, dan meningkatkan kualitas layanan.",
        "Kepatuhan administratif atau hukum yang relevan, termasuk dokumentasi transaksi dan audit internal.",
      ],
    },
    {
      heading: "Tujuan Penggunaan Data",
      paragraphs: [
        "Data pengguna dipakai sejauh diperlukan untuk menyediakan layanan Rabbani Institute secara aman dan fungsional.",
      ],
      items: [
        "Membuat, mengelola, dan mengamankan akun pengguna.",
        "Memberikan akses ke kelas, ujian, dan fitur belajar sesuai role dan hak akses.",
        "Mengirim OTP, notifikasi sistem, informasi jadwal, atau pembaruan layanan.",
        "Mengelola pembayaran, verifikasi transaksi, dan pencatatan administratif.",
        "Meningkatkan kualitas layanan, menangani masalah teknis, serta mencegah penyalahgunaan sistem.",
      ],
    },
    {
      heading: "Data Pengguna yang Diambil dari Google",
      paragraphs: [
        "Jika Anda memilih masuk atau mendaftar menggunakan akun Google, Rabbani Institute dapat menerima data profil dasar dari Google sesuai izin yang Anda setujui pada layar login.",
        "Data tersebut kami gunakan hanya untuk proses autentikasi, pembuatan atau pencocokan akun, menjaga keamanan akses, dan memudahkan penggunaan layanan tanpa perlu membuat kata sandi terpisah.",
      ],
      items: [
        "Data yang dapat kami terima meliputi nama, alamat email, foto profil, dan pengenal akun Google yang diperlukan untuk proses login.",
        "Kami tidak meminta akses ke Gmail, Google Drive, Google Calendar, atau data Google lain di luar informasi profil dasar kecuali kami menyatakannya secara terpisah dan Anda menyetujuinya lebih dahulu.",
        "Data akun Google tidak kami jual, tidak kami pakai untuk iklan yang tidak berkaitan dengan operasional Rabbani Institute, dan tidak kami gunakan untuk melatih model AI umum.",
        "Jika Anda tidak lagi ingin menggunakan login Google, Anda dapat menghubungi kami untuk meminta penyesuaian metode akses akun sesuai kebijakan yang berlaku.",
      ],
    },
    {
      heading: "Penyimpanan, Retensi, dan Penghapusan Data",
      paragraphs: [
        "Data disimpan selama akun masih aktif atau selama diperlukan untuk operasional, keamanan, dokumentasi akademik, audit internal, dan kepatuhan yang relevan.",
        "Sebagian data dapat tetap disimpan secara terbatas meskipun akun tidak lagi aktif apabila dibutuhkan untuk catatan transaksi, penyelesaian sengketa, atau perlindungan sistem.",
      ],
      items: [
        "Kami berupaya menghapus atau menganonimkan data yang tidak lagi diperlukan secara wajar.",
        "Permintaan penghapusan data akan kami tinjau dengan mempertimbangkan keamanan akun, catatan transaksi, dan kewajiban administratif yang masih berjalan.",
      ],
    },
    {
      heading: "Pihak Ketiga yang Mendukung Operasional",
      paragraphs: [
        "Untuk menjalankan platform, Rabbani Institute dapat menggunakan layanan pihak ketiga yang mendukung hosting, autentikasi, basis data, pembayaran, analitik, dan pengiriman pesan.",
      ],
      items: [
        "Data hanya dibagikan sejauh diperlukan untuk menjalankan fungsi layanan tersebut.",
        "Kami tidak menjual data pribadi pengguna kepada pihak lain.",
        "Setiap penggunaan layanan pihak ketiga tetap tunduk pada kebijakan dan standar teknis penyedia yang bersangkutan.",
      ],
    },
    {
      heading: "Cookie, Sesi, dan Keamanan Teknis",
      paragraphs: [
        "Platform Rabbani Institute dapat menggunakan cookie, token sesi, dan mekanisme autentikasi lain untuk menjaga pengguna tetap masuk, melindungi akun, serta memastikan fitur berjalan dengan baik.",
        "Kami berupaya menerapkan langkah keamanan yang wajar untuk melindungi data dari akses yang tidak sah, perubahan yang tidak diinginkan, atau kehilangan data.",
      ],
    },
    {
      heading: "Hak Pengguna atas Data",
      paragraphs: [
        "Pengguna dapat meminta akses, pembaruan, atau koreksi atas data pribadi yang tidak akurat. Dalam kondisi tertentu, pengguna juga dapat meminta penghapusan data tertentu sejauh hal itu memungkinkan secara operasional dan hukum.",
        "Permintaan terkait data dapat memerlukan verifikasi identitas terlebih dahulu untuk menjaga keamanan akun dan informasi pribadi.",
      ],
      items: [
        "Meminta ringkasan data akun yang kami simpan dalam batas yang wajar.",
        "Memperbarui informasi profil yang tidak akurat atau tidak lagi relevan.",
        "Meminta penghentian penggunaan login Google dan beralih ke metode login lain jika tersedia.",
        "Meminta penghapusan akun atau data tertentu melalui kontak resmi Rabbani Institute.",
      ],
    },
    {
      heading: "Cara Menghubungi Kami Terkait Privasi",
      paragraphs: [
        `Untuk pertanyaan privasi, permintaan koreksi, atau permintaan penghapusan data, silakan hubungi kami melalui email ${contactEmail}.`,
        "Agar permintaan dapat diproses dengan aman, kami dapat meminta informasi verifikasi tambahan untuk memastikan bahwa permintaan benar-benar berasal dari pemilik akun yang sah.",
      ],
    },
    {
      heading: "Privasi Peserta Usia Muda",
      paragraphs: [
        "Jika akun digunakan oleh peserta yang masih berada di bawah tanggung jawab orang tua atau wali, maka orang tua atau wali bertanggung jawab atas persetujuan penggunaan platform dan pengawasan akun tersebut.",
      ],
    },
    {
      heading: "Perubahan Kebijakan Privasi",
      paragraphs: [
        "Kebijakan Privasi ini dapat diperbarui sewaktu-waktu untuk menyesuaikan perkembangan layanan dan kebutuhan operasional Rabbani Institute.",
        "Versi terbaru akan dipublikasikan di website ini dan berlaku sejak tanggal ditampilkan. Penggunaan layanan setelah perubahan dipublikasikan dianggap sebagai persetujuan terhadap versi terbaru.",
      ],
    },
  ];
}

export default async function PrivacyPolicyPage() {
  const settings = await getPublicSiteSettings();
  const contactEmail = settings.contact_email || "info@rabbaniinstitute.id";
  const sections = createSections(contactEmail);

  return (
    <PolicyPage
      pretitle="Kebijakan Privasi"
      title="Cara Rabbani Institute mengelola data pengguna"
      intro="Halaman ini menjelaskan data apa saja yang dikumpulkan oleh Rabbani Institute, untuk tujuan apa data tersebut digunakan, dan bagaimana data itu dijaga selama layanan berlangsung."
      sections={sections}
    />
  );
}
