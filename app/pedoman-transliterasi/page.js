import Link from "next/link";
import styles from "./page.module.css";

export const metadata = {
  title: "Pedoman Transliterasi",
  description: "Pedoman transliterasi Arab-Latin Rabbani Institute: huruf, diakritik, hamzah waṣl, lām ta’rīf, dan penulisan nama.",
  alternates: { canonical: "/pedoman-transliterasi" },
};

const sections = [
  ["huruf", "Transliterasi dasar"],
  ["nama", "Nama & selain nama"],
  ["hamzah-wasl", "Hamzah waṣl"],
  ["lam-tarif", "Lām ta’rīf"],
  ["harakat-akhir", "Harakat huruf terakhir"],
  ["idafah", "Iḍāfah"],
  ["ketentuan-penulisan", "Ketentuan penulisan"],
];

const letterGroups = [
  [["ء", "‘"], ["ب", "b"], ["ت", "t"], ["ث", "ts"], ["ج", "j"], ["خ", "kh"], ["د", "d"], ["ذ", "dz"], ["ر", "r"]],
  [["ز", "z"], ["س", "s"], ["ش", "sy"], ["ع", "‘"], ["غ", "gh"], ["ف", "f"], ["ق", "q"], ["ك", "k"], ["ل", "l"]],
  [["م", "m"], ["ن", "n"], ["ه", "h"], ["و", "w"], ["ي", "y"], ["ـَـ", "a"], ["ـِـ", "i"], ["ـُـ", "u"], ["ة", "t / h"]],
];

const nameLetters = [
  ["ح", "h", "ḥ"], ["ص", "sh", "ṣ"], ["ض", "dh", "ḍ"], ["ط", "th", "ṭ"], ["ظ", "zh", "ẓ"],
  ["ـَا / ـَى", "a", "ā"], ["ـِيْ", "i", "ī"], ["ـُوْ", "u", "ū"],
  ["ـَيْ", "ai", "ay"], ["ـَوْ", "au", "aw"], ["ـِيّ", "iyy", "īy"],
];

const articleRules = [
  ["a", "Nama", "محمد الأمين", "Muhammad al-Amin"],
  ["a", "Di awal kalimat", "الحمد لله", "Al-Ḥamd lil-Lāh"],
  ["a", "Kata sebelumnya berakhiran fatḥah atau alif", "نزل القرآن", "Nazal al-Qur’ān"],
  ["i", "Kata sebelumnya berakhiran kasrah atau ya’ sukūn", "رب العالمين", "Rabb il-‘ālamīn"],
  ["u", "Kata sebelumnya berakhiran ḍammah atau waw sukūn", "حرز الأماني", "Ḥirz ul-Amānī"],
  ["Tidak ditransliterasikan", <>Didahului oleh huruf <Arabic>ب ت ف ك ل و في</Arabic></>, "بالحق", "bil-ḥaqq"],
];

const verbRules = [
  ["i", "Huruf ketiganya berharakat fatḥah atau kasrah", "اهدنا", "ihdinā"],
  ["u", "Huruf ketiganya berharakat ḍammah", "أن اعبدوا الله", "an u’budū ul-Lāh"],
  ["Tidak ditransliterasikan", <>Mendapat awalan huruf <Arabic>و ف ل</Arabic></>, "فارهبون", "farhabūn"],
];

function Arabic({ children }) {
  return <bdi lang="ar" dir="rtl" className={styles.arabic}>{children}</bdi>;
}

function RuleTable({ caption, rows }) {
  return (
    <div className={styles.tableScroll} tabIndex={0} role="region" aria-label={caption}>
      <table className={styles.ruleTable}>
        <caption>{caption}</caption>
        <thead><tr><th scope="col">Transliterasi</th><th scope="col">Kondisi</th><th scope="col">Contoh Arab</th><th scope="col">Contoh Latin</th></tr></thead>
        <tbody>{rows.map(([latin, condition, arabic, example], index) => (
          <tr key={index}><td>{latin}</td><td>{condition}</td><td><Arabic>{arabic}</Arabic></td><td><em>{example}</em></td></tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function SectionTitle({ number, children }) {
  return <h2><span className={styles.sectionNumber} aria-hidden="true">{number}</span>{children}</h2>;
}

export default function TransliterationGuidePage() {
  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <Link href="/" className={styles.backLink}>← Beranda</Link>
        <p className={styles.eyebrow}>Panduan penulisan · Rabbani Institute</p>
        <h1>Pedoman Transliterasi</h1>
        <p className={styles.intro}>Acuan penulisan huruf dan kata bahasa Arab dalam huruf Latin, termasuk penggunaan diakritik, penulisan nama, dan bentuk-bentuk khusus.</p>
      </header>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <nav aria-label="Daftar isi pedoman transliterasi">
            <p className={styles.tocTitle}>Dalam halaman ini</p>
            <ol>{sections.map(([id, title], index) => <li key={id}><a href={`#${id}`}><span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>{title}</a></li>)}</ol>
          </nav>
        </aside>

        <article className={styles.content}>
          <section id="huruf" className={styles.section}>
            <SectionTitle number="01">Transliterasi dasar</SectionTitle>
            <div className={styles.letterGrid}>
              {letterGroups.map((rows, index) => (
                <table key={index} className={styles.letterTable}>
                  <caption className={styles.srOnly}>Transliterasi dasar, kelompok {index + 1}</caption>
                  <thead><tr><th scope="col">Huruf</th><th scope="col">Transliterasi</th></tr></thead>
                  <tbody>{rows.map(([arabic, latin]) => <tr key={arabic}><td><Arabic>{arabic}</Arabic></td><td>{latin}</td></tr>)}</tbody>
                </table>
              ))}
            </div>
            <div className={styles.note}>
              <h3>Catatan</h3>
              <ul><li><em>Hamzah</em> tidak ditransliterasikan jika berada di awal kata.</li><li><em>Tā’ marbūṭah</em> ditransliterasikan h jika berada di akhir kalimat.</li></ul>
            </div>
          </section>

          <section id="nama" className={styles.section}>
            <SectionTitle number="02">Nama &amp; selain nama</SectionTitle>
            <p>Terdapat beberapa huruf yang transliterasinya dibedakan berdasarkan apakah untuk nama atau selain nama. Huruf-huruf tersebut ketika dipakai pada kata-kata selain nama akan menggunakan tanda diakritik.</p>
            <p>Karena tanda diakritik tidak dipakai pada penulisan nama penulis di daftar pustaka, maka untuk keserasian, semua nama orang yang ditulis pada tubuh teks juga tidak akan mendapat tanda diakritik. Selain itu, transliterasi yang digunakan untuk nama juga mempertimbangkan penggunaan umum pada sumber-sumber yang telah terbit. Cara ini dimaksudkan untuk memudahkan pembaca menemukan sumber referensi yang telah terbit.</p>
            <table className={styles.nameTable}>
              <caption>Huruf dengan perbedaan transliterasi</caption>
              <thead><tr><th scope="col">Huruf</th><th scope="col">Nama</th><th scope="col">Selain nama</th></tr></thead>
              <tbody>{nameLetters.map(([arabic, name, other]) => <tr key={arabic}><td><Arabic>{arabic}</Arabic></td><td>{name}</td><td>{other}</td></tr>)}</tbody>
            </table>
            <div className={styles.note}><p>Huruf <em>‘ayn</em> yang mengawali sebagian nama bisa tidak ditransliterasikan untuk mengikuti penggunaan umum. Contoh: Abdullah, Abdurrahman, Umar.</p></div>
          </section>

          <section id="hamzah-wasl" className={styles.section}>
            <SectionTitle number="03">Hamzah waṣl</SectionTitle>
            <h3>Pada alif-lām ta’rīf</h3>
            <RuleTable caption="Hamzah waṣl pada alif-lām ta’rīf" rows={articleRules} />
            <h3>Pada isim</h3>
            <RuleTable caption="Hamzah waṣl pada isim" rows={[["i", "Semua kondisi", "الاستنباط", "al-istinbāṭ"]]} />
            <h3>Pada fi’il</h3>
            <RuleTable caption="Hamzah waṣl pada fi’il" rows={verbRules} />
          </section>

          <section id="lam-tarif" className={styles.section}>
            <SectionTitle number="04">Lām ta’rīf</SectionTitle>
            <p>Jika bertemu huruf-huruf <em>iẓhār qamarīyah</em>, maka <em>lām ta’rīf</em> ditransliterasikan l-. Jika bertemu huruf-huruf <em>idghām syamsīyah</em>, maka ditransliterasikan sesuai huruf-huruf idghām tersebut, diikuti tanda hubung.</p>
            <div className={styles.exampleGrid}>
              {[{ title: "Iẓhār", rows: [["القمر", "al-qamar"], ["الكتاب", "al-Kitāb"], ["اليوم", "al-yawm"]] }, { title: "Idghām", rows: [["الشمس", "asy-syams"], ["الصراط", "aṣ-ṣirāṭ"], ["الليل", "al-layl"]] }].map(({ title, rows }) => (
                <table className={styles.exampleTable} key={title}>
                  <caption>{title}</caption><thead><tr><th scope="col">Arab</th><th scope="col">Latin</th></tr></thead>
                  <tbody>{rows.map(([arabic, latin]) => <tr key={arabic}><td><Arabic>{arabic}</Arabic></td><td><em>{latin}</em></td></tr>)}</tbody>
                </table>
              ))}
            </div>
          </section>

          <section id="harakat-akhir" className={styles.section}>
            <SectionTitle number="05">Harakat huruf terakhir</SectionTitle>
            <p>Harakat huruf terakhir, baik isim maupun fi’il, tidak ditulis, kecuali pada <em>hā’ ḍamīr</em>.</p>
          </section>

          <section id="idafah" className={styles.section}>
            <SectionTitle number="06">Iḍāfah</SectionTitle>
            <ul className={styles.rules}>
              <li><em>Iḍāfah</em> ke lafazh jalalah, maka ditulis bergandeng tanpa tanda pemisah. Misal, <Arabic>كتاب الله</Arabic> ditransliterasikan <em>kitābullāh</em>.</li>
              <li><em>Iḍāfah</em> pada penulisan nama, untuk laqab (seperti <Arabic>جلال الدين</Arabic>), abu yang diikuti kata dengan alif-lam (seperti <Arabic>أبو الحسن</Arabic>), dan abdu (seperti <Arabic>عبد الرحمن</Arabic> dan <Arabic>عبد الله</Arabic>), ketiganya ditulis bergandeng tanpa tanda pemisah.</li>
              <li><em>Iḍāfah</em> kata <Arabic>ابن</Arabic> ditransliterasikan ibn dan <Arabic>بن</Arabic> ditransliterasikan bin. <em>Iḍāfah</em> <Arabic>ابن</Arabic> dan <Arabic>بن</Arabic> pada penulisan nama dapat menyelisihi pedoman ini untuk mengikuti penggunaan umum.</li>
            </ul>
          </section>

          <section id="ketentuan-penulisan" className={styles.section}>
            <SectionTitle number="07">Ketentuan penulisan</SectionTitle>
            <h3>Nama penerbit</h3>
            <p>Pada penulisan sumber sitasi maupun daftar pustaka, transliterasi nama penerbit buku dapat ditulis secara fleksibel, tanpa terlalu terikat dengan pedoman transliterasi ini.</p>
            <h3>Kata serapan &amp; huruf miring</h3>
            <p>Kata-kata bahasa Arab yang telah diserap ke dalam bahasa Indonesia dapat menggunakan kata-kata dengan ejaan baku, seperti Allah, Muhammad, Al-Qur’an, kiblat, dan rida. Transliterasi yang bukan ejaan baku harus ditulis miring, kecuali pada judul bab atau judul bagian.</p>
            <h3>Nama surat Al-Qur’an</h3>
            <p>Nama surat Al-Qur’an ditulis miring hanya jika dipakai dalam konteks kutipan, istilah, dan judul; selainnya ditulis tegak.</p>
          </section>
          <a className={styles.backLink} href="#">Kembali ke atas ↑</a>
        </article>
      </div>
    </main>
  );
}
