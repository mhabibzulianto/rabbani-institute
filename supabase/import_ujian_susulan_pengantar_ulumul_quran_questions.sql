begin;

do $$
declare
  target_exam_id bigint;
begin
  select id
  into target_exam_id
  from public.exam_modules
  where slug = 'ujian-susulan-pengantar-ulumul-quran';

  if target_exam_id is null then
    raise exception 'Exam dengan slug ujian-susulan-pengantar-ulumul-quran tidak ditemukan';
  end if;

  delete from public.exam_questions
  where exam_id = target_exam_id;

  insert into public.exam_questions (
    exam_id, sort_order, prompt, question_type, option_list, grid_rows, grid_columns, answer_key, points
  )
  values
  (
    target_exam_id, 1, 'Qur''an secara bahasa berarti', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'membaca'),
      jsonb_build_object('key', 'b', 'label', 'mengikuti'),
      jsonb_build_object('key', 'c', 'label', 'bangun'),
      jsonb_build_object('key', 'd', 'label', 'turun')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 2, 'Al-Qur''an adalah Kalamullah. Ini adalah pendapat ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'ahlussunnah'),
      jsonb_build_object('key', 'b', 'label', 'mu''tazilah'),
      jsonb_build_object('key', 'c', 'label', 'asya''irah'),
      jsonb_build_object('key', 'd', 'label', 'syi''ah')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 3, 'Yang tidak termasuk ruang lingkup Ulumul Qur''an adalah', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'Ilmu tajwid'),
      jsonb_build_object('key', 'b', 'label', 'Ilmu qiraat'),
      jsonb_build_object('key', 'c', 'label', 'Ilmu tafsir'),
      jsonb_build_object('key', 'd', 'label', 'Ilmu nahwu')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 4, 'Di antara yang mengarang buku dalam Ulumul Qur''an adalah ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'Taqiyuddin Abul Abbas Ibnu Taimiyyah'),
      jsonb_build_object('key', 'b', 'label', 'Syaikh Shalih Sindi'),
      jsonb_build_object('key', 'c', 'label', 'Imaduddin Abul Fida'' Ibnu Katsir'),
      jsonb_build_object('key', 'd', 'label', 'Jalaluddin as-Suyuthi')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 5, 'Yang merupakan nama Al-Qur''an adalah', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'asy-Syifa'''),
      jsonb_build_object('key', 'b', 'label', 'al-Huda'),
      jsonb_build_object('key', 'c', 'label', 'adz-Dzikr'),
      jsonb_build_object('key', 'd', 'label', 'Laa raiba fiih')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 6, 'Tujuan diturunkannya Al-Qur''an adalah untuk ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'menjadi bacaan, karena satu hurufnya bernilai 10 kebaikan'),
      jsonb_build_object('key', 'b', 'label', 'hiburan, karena terdapat kisah-kisah di dalamnya'),
      jsonb_build_object('key', 'c', 'label', 'menjadi petunjuk')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 7, 'Kitab tafsir yang berisi hadits-hadits palsu tentang keutamaan surat-surat di Al-Qur''an adalah ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'Tafsir Ibnu Katsir'),
      jsonb_build_object('key', 'b', 'label', 'Tafsir al-Baidhawi'),
      jsonb_build_object('key', 'c', 'label', 'Tafsir ats-Tsa''labi'),
      jsonb_build_object('key', 'd', 'label', 'Tafsir Sayyid Quthub')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 8, 'Al-Qur''an juga memakai kata "wahyu" dengan makna bahasa', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'Benar'),
      jsonb_build_object('key', 'b', 'label', 'Salah')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 9, 'Al-Qur''an diturunkan secara tertulis dan bacaan', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'Benar'),
      jsonb_build_object('key', 'b', 'label', 'Salah')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 10, 'Yang merupakan 1/46 wahyu adalah ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'berdiam diri di gua hira'''),
      jsonb_build_object('key', 'b', 'label', 'membangun Ka''bah'),
      jsonb_build_object('key', 'c', 'label', 'mimpi yang benar'),
      jsonb_build_object('key', 'd', 'label', 'ahruf sab''ah')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 11, 'Makki dan Madani menurut penulis buku adalah pembagian surat di Al-Qur''an berdasarkan', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'tempat turunnya'),
      jsonb_build_object('key', 'b', 'label', 'periode turunnya'),
      jsonb_build_object('key', 'c', 'label', 'audiens yang dituju setiap surat'),
      jsonb_build_object('key', 'd', 'label', 'panjang-pendeknya')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 12, 'Ayat hukum banyak ditemukan di surat ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'makkiyyah'),
      jsonb_build_object('key', 'b', 'label', 'madaniyyah')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 13, 'Huruf yang menunjukkan sababun nuzul yang tegas adalah', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'أَنْزَلَ anzala'),
      jsonb_build_object('key', 'b', 'label', 'أوحى awhaa'),
      jsonb_build_object('key', 'c', 'label', 'ف'),
      jsonb_build_object('key', 'd', 'label', 'ك')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 14, 'Salah satu fungsi mengetahui sababun nuzul adalah untuk mengetahui nasikh dan mansukh', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'Benar'),
      jsonb_build_object('key', 'b', 'label', 'Salah')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 15, 'Perubahan arah kiblat adalah contoh naskh yang diingkari oleh', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'pengikut madzhab ahlur ra''yi, seperti Abu Hanifah'),
      jsonb_build_object('key', 'b', 'label', 'pengikut madzhab ahlul hadits, seperti Ahmad dan Yahya bin Ma''in'),
      jsonb_build_object('key', 'c', 'label', 'Syiah Rafidhah'),
      jsonb_build_object('key', 'd', 'label', 'Yahudi')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 16, 'Ayat tentang wasiat kepada ahli waris adalah contoh ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'nasikh'),
      jsonb_build_object('key', 'b', 'label', 'mansukh')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 17, 'Ulama ushul sepakat bahwa langkah pertama ketika menemukan dalil yang bertentangan adalah berusaha dijamak (dikompromikan).', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'Benar'),
      jsonb_build_object('key', 'b', 'label', 'Salah, karena yang pertama adalah menentukan naskh'),
      jsonb_build_object('key', 'c', 'label', 'Salah, karena yang pertama adalah tarjih'),
      jsonb_build_object('key', 'd', 'label', 'Salah, karena tidak disepakati')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 18, 'Ahruf sab''ah turun di ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'Mekkah'),
      jsonb_build_object('key', 'b', 'label', 'Madinah')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 19, 'Al-Qur''an telah ditulis ketika Nabi masih hidup.', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'Benar'),
      jsonb_build_object('key', 'b', 'label', 'Salah')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 20, 'Yang diinginkan Utsman bin Affan ketika mengirimkan mushaf ke berbagai wilayah Islam adalah ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'menimbulkan keresahan'),
      jsonb_build_object('key', 'b', 'label', 'meminta agar mushaf yang dia tulis dikoreksi oleh sahabat di berbagai wilayah, lalu dikembalikan ke Madinah'),
      jsonb_build_object('key', 'c', 'label', 'menyatukan kaum muslimin atas satu bacaan'),
      jsonb_build_object('key', 'd', 'label', 'mengenalkan mushaf yang baru, sehingga menambah variasi mushaf yang ada')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 21, 'Sebab pengumpulan mushaf di Zaman Abu Bakar adalah ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'Perang Yamamah'),
      jsonb_build_object('key', 'b', 'label', 'Perang Badar'),
      jsonb_build_object('key', 'c', 'label', 'Perang Salib'),
      jsonb_build_object('key', 'd', 'label', 'Pembebasan Azerbaijan')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 22, 'Ulama sepakat bahwa rasm utsmani adalah rasm standar pada zamannya.', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'Benar'),
      jsonb_build_object('key', 'b', 'label', 'Salah')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 23, 'Fitur rasm utsmani:', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'tidak memiliki titik'),
      jsonb_build_object('key', 'b', 'label', 'memiliki harakat'),
      jsonb_build_object('key', 'c', 'label', 'tidak berbeda dari rasm imla''i')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 24, 'Dhabth yang dipakai sampai sekarang adalah ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'dhabth Abul Aswad ad-Du''ali'),
      jsonb_build_object('key', 'b', 'label', 'dhabth al-Khalil bin Ahmad al-Farahidi'),
      jsonb_build_object('key', 'c', 'label', 'dhabth Abu Amr ad-Dani')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 25, 'Qiraat terbagi menjadi:', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'sab''ah dan ''asyarah'),
      jsonb_build_object('key', 'b', 'label', 'maqbulah dan syadz'),
      jsonb_build_object('key', 'c', 'label', 'rasmi dan ghairu rasmi'),
      jsonb_build_object('key', 'd', 'label', 'ikhtiyaari dan taqliidii')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 26, 'Tidak ada perbedaan riwayat mengenai jumlah ayat di Al-Qur''an', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'Benar'),
      jsonb_build_object('key', 'b', 'label', 'Salah')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 27, 'Yang bukan sumber penamaan surat adalah', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'hadits-hadits Nabi'),
      jsonb_build_object('key', 'b', 'label', 'penamaan dari sahabat'),
      jsonb_build_object('key', 'c', 'label', 'permulaan surat'),
      jsonb_build_object('key', 'd', 'label', 'gabungan permulaan dan akhir surat sebelumnya')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 28, 'Terdapat ... tingkatan makna', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', '2'),
      jsonb_build_object('key', 'b', 'label', '4')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 29, 'Terdapat 3 makna takwil, salah satunya ..', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'sinonim dari istinbath'),
      jsonb_build_object('key', 'b', 'label', 'majaz'),
      jsonb_build_object('key', 'c', 'label', 'perealisasian apa yang diinginkan oleh suatu perkataan')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 30, 'Salah satu makna tadabbur adalah merenungkan bahwa ayat-ayat Al-Qur’an itu berasal dari Allah.', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'Benar'),
      jsonb_build_object('key', 'b', 'label', 'Salah')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 31, 'Ulumul Qur''an yang paling pertama perlu ditekuni untuk memahami tafsir adalah ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'ushul tafsir'),
      jsonb_build_object('key', 'b', 'label', 'ushul istinbath'),
      jsonb_build_object('key', 'c', 'label', 'gharibul qur''an'),
      jsonb_build_object('key', 'd', 'label', 'qiraat')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 32, 'Tafsir tahlili, ijmali, muqarin, dan maudhu''i adalah ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'kaidah tafsir'),
      jsonb_build_object('key', 'b', 'label', 'jenis tafsir'),
      jsonb_build_object('key', 'c', 'label', 'metode tafsir'),
      jsonb_build_object('key', 'd', 'label', 'sumber tafsir')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 33, 'Tafsir Ibnu Jarir ath-Thabari termasuk jenis tafsir ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'tahlili'),
      jsonb_build_object('key', 'b', 'label', 'ijmali'),
      jsonb_build_object('key', 'c', 'label', 'muqarin'),
      jsonb_build_object('key', 'd', 'label', 'maudhu''il')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 34, 'Gharibul Qur''an adalah ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'kata-kata yang memiliki lebih dari satu makna'),
      jsonb_build_object('key', 'b', 'label', 'kata-kata yang bukan dari bahasa Arab'),
      jsonb_build_object('key', 'c', 'label', 'kata-kata yang maknanya samar-samar'),
      jsonb_build_object('key', 'd', 'label', 'ayat yang sudah dihapus hukumnya dengan ayat lain')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 35, 'Kata الأمة memiliki beberapa macam makna, yaitu: kelompok manusia, rentang waktu, agama, dan pemimpin dalam kebaikan. Ini menunjukkan bahwa kata الأمة memiliki banyak ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'gharib'),
      jsonb_build_object('key', 'b', 'label', 'wujuh'),
      jsonb_build_object('key', 'c', 'label', 'nazhair'),
      jsonb_build_object('key', 'd', 'label', 'mutasyabihat')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 36, 'Nama-nama yang disamarkan disebut ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'mubham'),
      jsonb_build_object('key', 'b', 'label', 'mafhum'),
      jsonb_build_object('key', 'c', 'label', 'mu''jam'),
      jsonb_build_object('key', 'd', 'label', 'mutasyabih')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 37, 'Faktor paling dominan atas keberadaan nama-nama yang disamarkan adalah ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'tidak memiliki faidah besar ketika disebutkan secara eksplisit'),
      jsonb_build_object('key', 'b', 'label', 'sudah jelas di kalangan pendengar'),
      jsonb_build_object('key', 'c', 'label', 'mengagungkan pihak tersebut karena atribut yang dimiliki'),
      jsonb_build_object('key', 'd', 'label', 'mengisyaratkan keumuman hukumnya')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 38, 'Mu''arrab adalah ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'kata-kata yang memiliki lebih dari satu makna'),
      jsonb_build_object('key', 'b', 'label', 'kata-kata yang bukan dari bahasa Arab'),
      jsonb_build_object('key', 'c', 'label', 'kata-kata yang maknanya samar-samar'),
      jsonb_build_object('key', 'd', 'label', 'ayat yang sudah dihapus hukumnya dengan ayat lain')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 39, 'Jumlah mu''arrab di Al-Qur''an:', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', '50'),
      jsonb_build_object('key', 'b', 'label', '80'),
      jsonb_build_object('key', 'c', 'label', '120')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 40, 'Hal yang sudah harus diketahui sebelum mengi''rab adalah sudah mengetahui maknanya.', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'Benar'),
      jsonb_build_object('key', 'b', 'label', 'Salah')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 41, 'Istilah mutasyabih memiliki ... makna', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', '2'),
      jsonb_build_object('key', 'b', 'label', '3'),
      jsonb_build_object('key', 'c', 'label', '4')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 42, 'Umumnya, jika disebut "mutasyabih" saja, yang dimaksud adalah ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'mutasyabih lafzhi'),
      jsonb_build_object('key', 'b', 'label', 'mutasyabih ma''nawi'),
      jsonb_build_object('key', 'c', 'label', 'mutasyabih siyaqi'),
      jsonb_build_object('key', 'd', 'label', 'muhkam')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 43, 'Bab-bab Ulumul Qur''an yang bersilangan dengan Ushul Fiqih disebut ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'qawa''id fiqhiyyah'),
      jsonb_build_object('key', 'b', 'label', 'ilmu nash, muhkam, dan zhahir'),
      jsonb_build_object('key', 'c', 'label', 'dalalatul alfazh'),
      jsonb_build_object('key', 'd', 'label', 'tafsir ahkam')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 44, 'Contoh ayat mujmal yang datang penjelasannya di Al-Qur''an adalah ayat tentang ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'zakat'),
      jsonb_build_object('key', 'b', 'label', 'shalat'),
      jsonb_build_object('key', 'c', 'label', 'malam yang diberkahi'),
      jsonb_build_object('key', 'd', 'label', 'tata cara manasik haji')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 45, 'Contoh redaksi kata ''am adalah ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'isim nakirah dalam kalimat positif'),
      jsonb_build_object('key', 'b', 'label', 'isim nakirah dalam kalimat negatif'),
      jsonb_build_object('key', 'c', 'label', 'isim nakirah dalam kalimat perintah'),
      jsonb_build_object('key', 'd', 'label', 'isim ma''rifat dalam kalimat tanya')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 46, 'Ilmu yang membahas sumpah di Al-Qur''an disebut', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'Muthlaq ul-Qur''an'),
      jsonb_build_object('key', 'b', 'label', 'Aqsam ul-Qur''an'),
      jsonb_build_object('key', 'c', 'label', 'Amtsal ul-Qur''an'),
      jsonb_build_object('key', 'd', 'label', 'Syahadat ul-Qur''an')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 47, 'Jika muqsam bih dan muqsam ''alaih dihapus dalam shighah sumpah, maka huruf yang menunjukkan itu sumpah adalah ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'ب'),
      jsonb_build_object('key', 'b', 'label', 'ت'),
      jsonb_build_object('key', 'c', 'label', 'ك'),
      jsonb_build_object('key', 'd', 'label', 'ل')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 48, 'Ilmu yang membahas perumpamaan dan peribahasa di Al-Qur''an disebut', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'amtsal ul-Qur''an'),
      jsonb_build_object('key', 'b', 'label', 'aqsam ul-Qur''an'),
      jsonb_build_object('key', 'c', 'label', 'tasybih'),
      jsonb_build_object('key', 'd', 'label', 'balaghah')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 49, 'Ilmu jadal ul-Qur''an adalah ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'nama lain aqsam ul-Qur''an'),
      jsonb_build_object('key', 'b', 'label', 'nama lain amtsal ul-Qur''an'),
      jsonb_build_object('key', 'c', 'label', 'ilmu yang membahas tentang debat yang ada di Al-Qur''an'),
      jsonb_build_object('key', 'd', 'label', 'ilmu cara debat yang baik dalam berdakwah')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 50, 'Istilah teknik debat yang disebutkan as-Suyuthi ada ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', '7'),
      jsonb_build_object('key', 'b', 'label', '4'),
      jsonb_build_object('key', 'c', 'label', '23')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  );
end $$;

commit;
