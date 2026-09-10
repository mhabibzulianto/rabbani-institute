begin;

do $$
declare
  target_exam_id bigint;
begin
  select id
  into target_exam_id
  from public.exam_modules
  where slug = 'ujian-susulan-nahwu-1';

  if target_exam_id is null then
    raise exception 'Exam dengan slug ujian-susulan-nahwu-1 tidak ditemukan';
  end if;

  delete from public.exam_questions
  where exam_id = target_exam_id;

  insert into public.exam_questions (
    exam_id, sort_order, prompt, question_type, option_list, grid_rows, grid_columns, answer_key, points
  )
  values
  (
    target_exam_id, 1, 'Klasifikasikan kata berikut', 'grid_single', '[]'::jsonb,
    jsonb_build_array(
      jsonb_build_object('key', 'row_1', 'label', 'Kata kerja'),
      jsonb_build_object('key', 'row_2', 'label', 'Orang, tempat, benda, ide'),
      jsonb_build_object('key', 'row_3', 'label', 'Kata depan')
    ),
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'Isim'),
      jsonb_build_object('key', 'b', 'label', 'Fi''il'),
      jsonb_build_object('key', 'c', 'label', 'Huruf')
    ),
    null, 6
  ),
  (
    target_exam_id, 2, 'Tentukan i''rab untuk kata berikut', 'grid_single', '[]'::jsonb,
    jsonb_build_array(
      jsonb_build_object('key', 'row_1', 'label', 'مُسْلِمُونَ'),
      jsonb_build_object('key', 'row_2', 'label', 'النَّاسَ an-naasa'),
      jsonb_build_object('key', 'row_3', 'label', 'دِينِ diini'),
      jsonb_build_object('key', 'row_4', 'label', 'أَنْتَ anta'),
      jsonb_build_object('key', 'row_5', 'label', 'أَبُو بَكْرٍ abuu bakrin')
    ),
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'Rofa'''),
      jsonb_build_object('key', 'b', 'label', 'Nashab'),
      jsonb_build_object('key', 'c', 'label', 'Jarr')
    ),
    null, 10
  ),
  (
    target_exam_id, 3, 'Dua penyebab isim menjadi berstatus jarr adalah ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'subyek dan obyek'),
      jsonb_build_object('key', 'b', 'label', 'jumlah ismiyah dan jumlah fi''liyah'),
      jsonb_build_object('key', 'c', 'label', 'di awali kata depan dan kepemilikan'),
      jsonb_build_object('key', 'd', 'label', 'tidak fleksibel dan fleksibel sebagian')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 4, 'Di antara kata berikut yang merupakan mudhaf istimewa adalah', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'أَنْتَ anta'),
      jsonb_build_object('key', 'b', 'label', 'قَبْلَ qabla'),
      jsonb_build_object('key', 'c', 'label', 'مِنْ min'),
      jsonb_build_object('key', 'd', 'label', 'مُسْلِمُو muslimuu')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 5, 'Berdasarkan bilangannya, isim ada tiga jenis, yaitu ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'rofa'', nashob, jarr'),
      jsonb_build_object('key', 'b', 'label', 'mufrad, mutsanna, jama'''),
      jsonb_build_object('key', 'c', 'label', 'fleksibel, tidak fleksibel, fleksibel sebagian'),
      jsonb_build_object('key', 'd', 'label', 'ismiyah, fi''liyah, harfiyah')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 6, 'Jama'' taksir diperlakukan ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'jama'' mudzakkar'),
      jsonb_build_object('key', 'b', 'label', 'jama'' muannats'),
      jsonb_build_object('key', 'c', 'label', 'mufrad mudzakkar'),
      jsonb_build_object('key', 'd', 'label', 'mufrad muannats')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 7, 'Yang termasuk isim ma''rifat:', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'isim maushul'),
      jsonb_build_object('key', 'b', 'label', 'isim isyarah'),
      jsonb_build_object('key', 'c', 'label', 'nama'),
      jsonb_build_object('key', 'd', 'label', 'semua benar')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 8, 'Yang termasuk isim yang feminin:', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'nama kota'),
      jsonb_build_object('key', 'b', 'label', 'nama perempuan'),
      jsonb_build_object('key', 'c', 'label', 'anggota tubuh berpasangan'),
      jsonb_build_object('key', 'd', 'label', 'semua benar')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 9, 'مَسَاجِد adalah isim ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'mufrad mudzakkar'),
      jsonb_build_object('key', 'b', 'label', 'jama'' taksir'),
      jsonb_build_object('key', 'c', 'label', 'jama'' mudzakkar salim'),
      jsonb_build_object('key', 'd', 'label', 'jama'' muannats salim')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 10, 'Tentukan jenis huruf berikut', 'grid_single', '[]'::jsonb,
    jsonb_build_array(
      jsonb_build_object('key', 'row_1', 'label', 'إنَّ inna'),
      jsonb_build_object('key', 'row_2', 'label', 'مِنْ min'),
      jsonb_build_object('key', 'row_3', 'label', 'لَيْتَ laita'),
      jsonb_build_object('key', 'row_4', 'label', 'فِيْ fii')
    ),
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'Huruf jarr'),
      jsonb_build_object('key', 'b', 'label', 'Huruf nashab')
    ),
    null, 8
  ),
  (
    target_exam_id, 11, 'Yang merupakan aturan idhafah:', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'mudhaf harus jarr'),
      jsonb_build_object('key', 'b', 'label', 'mudhaf ilaih harus jarr')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 12, 'Tentukan jenis frasanya', 'grid_single', '[]'::jsonb,
    jsonb_build_array(
      jsonb_build_object('key', 'row_1', 'label', 'رَسُولُ اللهِ "rasulullahi"'),
      jsonb_build_object('key', 'row_2', 'label', 'وَالْعَصْرِ "wal-''ashri"'),
      jsonb_build_object('key', 'row_3', 'label', 'إِنَّ الْإِنْسَانَ "innal-insaana"'),
      jsonb_build_object('key', 'row_4', 'label', 'أَنَّ مُحَمَّدًا "anna muhammadan"')
    ),
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'inna dan isimnya'),
      jsonb_build_object('key', 'b', 'label', 'idhafah'),
      jsonb_build_object('key', 'c', 'label', 'mausuf shifat'),
      jsonb_build_object('key', 'd', 'label', 'jarr-majrur')
    ),
    null, 8
  ),
  (
    target_exam_id, 13, 'Kata yang ditunjuk harus ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'mufrad'),
      jsonb_build_object('key', 'b', 'label', 'ma''rifat'),
      jsonb_build_object('key', 'c', 'label', 'mu''annats'),
      jsonb_build_object('key', 'd', 'label', 'marfu''')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 14, 'Perhatikan kalimat berikut: الْحَمْدُ للهِ. Yang merupakan mubtada'' adalah ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'الحمد'),
      jsonb_build_object('key', 'b', 'label', 'لله'),
      jsonb_build_object('key', 'c', 'label', 'huruf ل')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 15, 'Perhatikan kalimat berikut: زَيْدٌ طَالِبٌ في المدرسة. Yang merupakan khabar adalah ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'زيد'),
      jsonb_build_object('key', 'b', 'label', 'طالب'),
      jsonb_build_object('key', 'c', 'label', 'في'),
      jsonb_build_object('key', 'd', 'label', 'المدرسة')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 16, 'Muta''alliq bil-khabar hanya bisa berupa ...', 'multiple_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'isim jama'''),
      jsonb_build_object('key', 'b', 'label', 'frasa jarr-majrur'),
      jsonb_build_object('key', 'c', 'label', 'isim marfu'''),
      jsonb_build_object('key', 'd', 'label', 'frasa zharaf'),
      jsonb_build_object('key', 'e', 'label', 'frasa maushuf-shifat')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 17, 'Kalimat berikut yang susunannya abnormal adalah ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'والله غَفوُرٌ رَحِيْمٌ'),
      jsonb_build_object('key', 'b', 'label', 'إِنَّ اللهَ غَفُورٌ رَحِيمٌ'),
      jsonb_build_object('key', 'c', 'label', 'وَاللهُ قَدِيْرٌ'),
      jsonb_build_object('key', 'd', 'label', 'وِاللهُ عَلَى كُلِّ شَيْءٍ قَدِيْرٌ')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 18, 'Kalimat berikut yang tidak memiliki muta''alliq bil-khabar adalah ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'اهْدِنَا الصِّرَاطَ الْمُسْتَقِيْمَ'),
      jsonb_build_object('key', 'b', 'label', 'إِنَّ الْإِنْسَانَ لَفِي خُسْرٍ'),
      jsonb_build_object('key', 'c', 'label', 'إِنَّ مَعَ الْعُسْرِ يُسْرًا')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 19, 'Berikut ini yang merupakan fi''il madhi adalah', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'كَتَبَ kataba'),
      jsonb_build_object('key', 'b', 'label', 'الْكِتَابُ al-kitabu'),
      jsonb_build_object('key', 'c', 'label', 'يَكْتُبُ yaktubu'),
      jsonb_build_object('key', 'd', 'label', 'زَيْدٌ Zaidun')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 20, 'Jumlah fi''liyah terdiri dari ...', 'multiple_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'Fi''il'),
      jsonb_build_object('key', 'b', 'label', 'Fa''il'),
      jsonb_build_object('key', 'c', 'label', 'Alif-lam'),
      jsonb_build_object('key', 'd', 'label', 'Mashdar')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 21, 'Tentukan apakah pelaku orang dalam atau orang luar', 'grid_single', '[]'::jsonb,
    jsonb_build_array(
      jsonb_build_object('key', 'row_1', 'label', 'رَحِمَهُ اللهُ rahimahullah'),
      jsonb_build_object('key', 'row_2', 'label', 'إِذَا جَاءَ نَصْرُ اللهِ idza jaa''a nashrullaah'),
      jsonb_build_object('key', 'row_3', 'label', 'رَأَيْتُ النَّاسَ ra''aytu an-naasa')
    ),
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'Pelaku orang dalam (dhamir)'),
      jsonb_build_object('key', 'b', 'label', 'Pelaku orang luar (zhahir)')
    ),
    null, 6
  ),
  (
    target_exam_id, 22, 'Fi''il berikut yang pelakunya dobel adalah ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'عَمِلُوا'),
      jsonb_build_object('key', 'b', 'label', 'عَمِلَا'),
      jsonb_build_object('key', 'c', 'label', 'عَمِلْتُمْ'),
      jsonb_build_object('key', 'd', 'label', 'عَمِلْنَا')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 23, 'Huruf-huruf penanda fi''il mudhari'' adalah ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'أ ن ي ت'),
      jsonb_build_object('key', 'b', 'label', 'ا ت م و'),
      jsonb_build_object('key', 'c', 'label', 'ت ي ن ك'),
      jsonb_build_object('key', 'd', 'label', 'ك و ل ب')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 24, 'Fi''il mudhari'' bisa berkasus ...', 'multiple_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'rofa'''),
      jsonb_build_object('key', 'b', 'label', 'nashob'),
      jsonb_build_object('key', 'c', 'label', 'jazm'),
      jsonb_build_object('key', 'd', 'label', 'jarr')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 25, 'Lengkapi kalimat berikut dengan fi''il yang sesuai: لَنْ ......... البَيْتَ', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'يَخْرُجْ yakhruj'),
      jsonb_build_object('key', 'b', 'label', 'دَخَلَ dakhala'),
      jsonb_build_object('key', 'c', 'label', 'تَخْرُجَ takhruja'),
      jsonb_build_object('key', 'd', 'label', 'يَدْخُلُونَ yadkhuluuna')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 26, 'Kata yang dapat berfungsi untuk memberikan penegasan dalam kalimat adalah ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'maf''ul bih'),
      jsonb_build_object('key', 'b', 'label', 'maf''ul liajlihi'),
      jsonb_build_object('key', 'c', 'label', 'maf''ul fiih'),
      jsonb_build_object('key', 'd', 'label', 'maf''ul muthlaq'),
      jsonb_build_object('key', 'e', 'label', 'hal')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 27, 'Tentukan pelakunya', 'grid_single', '[]'::jsonb,
    jsonb_build_array(
      jsonb_build_object('key', 'row_1', 'label', 'يَعْلَمُ غَيْبَ السَمَاوَاتِ وَالْأَرْضِ'),
      jsonb_build_object('key', 'row_2', 'label', 'تَنْصُرُونَ اللهَ وَرَسُوْلَهُ'),
      jsonb_build_object('key', 'row_3', 'label', 'يَخَافُونَ اللهَ'),
      jsonb_build_object('key', 'row_4', 'label', 'نَعْلَمُ الْمُجَاهِدِينَ مِنْكُمْ')
    ),
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'هُوَ'),
      jsonb_build_object('key', 'b', 'label', 'هُمْ'),
      jsonb_build_object('key', 'c', 'label', 'أَنْتَ'),
      jsonb_build_object('key', 'd', 'label', 'نَحْنُ')
    ),
    null, 8
  ),
  (
    target_exam_id, 28, 'Terjemahkan ke bahasa Arab: Pergilah (kalian berdua)', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'اذْهَبَتَا idzhabataa'),
      jsonb_build_object('key', 'b', 'label', 'اذْهَبَا idzhabaa'),
      jsonb_build_object('key', 'c', 'label', 'اذْهَبِيْ idzhabii'),
      jsonb_build_object('key', 'd', 'label', 'اذْهَبُوا idzhabuu')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 29, 'Jika لَا diikuti oleh fi''il mudhari'' yang i''robnya marfu'', maka لا tersebut bermakna ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', '"Jangan"'),
      jsonb_build_object('key', 'b', 'label', '"Tidak"'),
      jsonb_build_object('key', 'c', 'label', '"Sumpah"')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 30, 'Tentukan makna لا pada tiap kalimat berikut', 'grid_single', '[]'::jsonb,
    jsonb_build_array(
      jsonb_build_object('key', 'row_1', 'label', 'لَا تَنْصُرُونَ اللهَ'),
      jsonb_build_object('key', 'row_2', 'label', 'لَا تَنْصُرُوا اللهَ'),
      jsonb_build_object('key', 'row_3', 'label', 'لَا أَنْصُرُ اللهَ')
    ),
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', '"Jangan"'),
      jsonb_build_object('key', 'b', 'label', '"Tidak"'),
      jsonb_build_object('key', 'c', 'label', '"Sumpah"')
    ),
    null, 6
  ),
  (
    target_exam_id, 31, 'Kalimat pasif ("majhul") adalah kalimat yang dihapus ..', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'Fi''il-nya'),
      jsonb_build_object('key', 'b', 'label', 'Fa''il-nya'),
      jsonb_build_object('key', 'c', 'label', 'Maf''ul-nya'),
      jsonb_build_object('key', 'd', 'label', 'Mubtada''-nya'),
      jsonb_build_object('key', 'e', 'label', 'Khabar-nya')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  );
end $$;

commit;
