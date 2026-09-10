export const languages = {
  id: {
    dir: "ltr",
    label: "Indonesia",
    nextLabel: "العربية",
  },
  ar: {
    dir: "rtl",
    label: "العربية",
    nextLabel: "Indonesia",
  },
};

export const dictionary = {
  id: {
    navHome: "Beranda",
    navCourses: "Kelas",
    navDashboard: "Studio",
    navLogin: "Masuk",
    navLogout: "Keluar",
    heroEyebrow: "Platform belajar online",
    heroTitle: "Belajar Islam dan Bahasa Arab secara terstruktur",
    heroText:
      "rabbani-institute menghadirkan kelas keislaman, Bahasa Arab, dan kajian bertahap dalam satu ruang belajar yang rapi.",
    startLearning: "Mulai belajar",
    createAccount: "Daftar gratis",
    featuredCourses: "Kelas unggulan",
    courseCatalog: "Katalog kelas",
    dashboardTitle: "Studio siswa",
    authTitle: "Masuk ke akun Rabbani",
    ssoTitle: "SSO Rabbani Institute",
    continueLearning: "Lanjutkan pembelajaran",
    lessonList: "Daftar lesson",
    markComplete: "Tandai selesai",
    enroll: "Ikuti kelas",
    openCourse: "Lihat kelas",
    profileLanguage: "Bahasa akun",
    emptyDashboard: "Kamu belum mengikuti kelas. Pilih kelas untuk mulai belajar.",
  },
  ar: {
    navHome: "الرئيسية",
    navCourses: "الدورات",
    navDashboard: "الاستوديو",
    navLogin: "الدخول",
    navLogout: "خروج",
    heroEyebrow: "منصة تعليمية إلكترونية",
    heroTitle: "تعلّم الإسلام واللغة العربية بمنهجية واضحة",
    heroText:
      "تجمع rabbani-institute الدروس الإسلامية والعربية والدورات المنظمة في مساحة تعلم واحدة.",
    startLearning: "ابدأ التعلم",
    createAccount: "سجل مجانا",
    featuredCourses: "الدورات المختارة",
    courseCatalog: "فهرس الدورات",
    dashboardTitle: "استوديو الطالب",
    authTitle: "الدخول إلى حساب رباني",
    ssoTitle: "تسجيل الدخول الموحد لرباني",
    continueLearning: "تابع التعلم",
    lessonList: "قائمة الدروس",
    markComplete: "تم الدرس",
    enroll: "التحق بالدورة",
    openCourse: "عرض الدورة",
    profileLanguage: "لغة الحساب",
    emptyDashboard: "لم تلتحق بأي دورة بعد. اختر دورة لبدء التعلم.",
  },
};

export function getDictionary(language) {
  return dictionary[language] || dictionary.id;
}

export function normalizeLanguage(language) {
  return language === "ar" ? "ar" : "id";
}
