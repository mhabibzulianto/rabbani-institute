begin;

do $$
declare
  target_exam_id bigint;
begin
  select id
  into target_exam_id
  from public.exam_modules
  where slug = 'ujian-susulan-sharf-1';

  if target_exam_id is null then
    raise exception 'Exam dengan slug ujian-susulan-sharf-1 tidak ditemukan';
  end if;

  delete from public.exam_questions
  where exam_id = target_exam_id;

  insert into public.exam_questions (
    exam_id, sort_order, prompt, question_type, option_list, grid_rows, grid_columns, answer_key, points
  )
  values
  (
    target_exam_id, 1, 'Kata yang terdiri dari 6 huruf yang semua hurufnya asli adalah', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'زلزل'),
      jsonb_build_object('key', 'b', 'label', 'دحرج'),
      jsonb_build_object('key', 'c', 'label', 'اجتماع')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 2, 'Huruf hamzah wash-al dalam kata "ٱهْدِنَا" dibaca jika ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'Diawal kalimat'),
      jsonb_build_object('key', 'b', 'label', 'Di tengah kalimat')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 3, 'Jika huruf-huruf أ - م - ن disatukan, maka menjadi ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'آمن'),
      jsonb_build_object('key', 'b', 'label', 'أامن'),
      jsonb_build_object('key', 'c', 'label', 'أمن')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 4, 'Jika huruf-huruf س - ء - ل disatukan, maka menjadi ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'ساءل'),
      jsonb_build_object('key', 'b', 'label', 'سأل'),
      jsonb_build_object('key', 'c', 'label', 'سال')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 5, 'Penulisan huruf hamzah yang benar adalah ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'أمنة'),
      jsonb_build_object('key', 'b', 'label', 'أمنة'),
      jsonb_build_object('key', 'c', 'label', 'إمنة'),
      jsonb_build_object('key', 'd', 'label', 'إمنة')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 6, 'Sebuah kata terdiri dari huruf-huruf asli dan huruf-huruf tambahan. Yang bertugas mencari huruf tambahan adalah ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'Ilmu nahwu'),
      jsonb_build_object('key', 'b', 'label', 'Ilmu sharf')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 7, 'Sebuah kata asal dipecah menjadi beberapa komponen yang membentuk kata asal itu. Proses ini disebut ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'Tashrif'),
      jsonb_build_object('key', 'b', 'label', 'Taqlib')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 8, 'Untuk mencari kata yang terdiri dari huruf asli dan huruf tambahan, maka kata tersebut harus dikembalikan dulu ke ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'Bentuk turunan'),
      jsonb_build_object('key', 'b', 'label', 'Kata asal')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 9, 'Fi''il madhi yang terdiri dari huruf asli 3 biasanya disebut ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'Kata asal'),
      jsonb_build_object('key', 'b', 'label', 'Kata turunan')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 10, 'Kata pertama yang dipelajari dalam bab sharf biasanya adalah ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'Fi''il madhi'),
      jsonb_build_object('key', 'b', 'label', 'Fi''il amr')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 11, 'Kata مَغْضُوبٍ, bentuk kata asalnya adalah ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'غَضَبَ'),
      jsonb_build_object('key', 'b', 'label', 'غَضِبَ'),
      jsonb_build_object('key', 'c', 'label', 'غَضُبَ')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 12, 'Kata نَعْبُدُ, bentuk kata asalnya adalah ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'عَبَدَ'),
      jsonb_build_object('key', 'b', 'label', 'عَبِدَ'),
      jsonb_build_object('key', 'c', 'label', 'عَبُدَ')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 13, 'Kata كُفِرَ, bentuk kata asalnya adalah ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'كَفَرَ'),
      jsonb_build_object('key', 'b', 'label', 'كَفِرَ'),
      jsonb_build_object('key', 'c', 'label', 'كَفُرَ')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 14, 'Kata اِعْلَمْ, bentuk kata asalnya adalah ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'عَلِمَ'),
      jsonb_build_object('key', 'b', 'label', 'عَلَمَ'),
      jsonb_build_object('key', 'c', 'label', 'عَلُمَ')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 15, 'Kata خَلَقَ, bentuk kata asalnya adalah ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'خَلَقَ'),
      jsonb_build_object('key', 'b', 'label', 'خَلِقَ'),
      jsonb_build_object('key', 'c', 'label', 'خَلُقَ')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 16, 'Kata لا تَقْهَرْ, bentuk kata asalnya adalah ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'قَهَرَ'),
      jsonb_build_object('key', 'b', 'label', 'قَهِرَ'),
      jsonb_build_object('key', 'c', 'label', 'قَهُرَ')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 17, 'Kata صَبْرٌ, bentuk kata asalnya adalah ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'صَبَرَ'),
      jsonb_build_object('key', 'b', 'label', 'صَبِرَ'),
      jsonb_build_object('key', 'c', 'label', 'صَبُرَ')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 18, 'Kata الْقَارِعَةُ, bentuk kata asalnya adalah ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'قَرَعَ'),
      jsonb_build_object('key', 'b', 'label', 'قَرِعَ'),
      jsonb_build_object('key', 'c', 'label', 'قَرُعَ')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 19, 'Kata مَمْنُونٍ, bentuk kata asalnya adalah ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'مَنَنَ'),
      jsonb_build_object('key', 'b', 'label', 'مَنِنَ'),
      jsonb_build_object('key', 'c', 'label', 'مَنُنَ')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 20, 'Kata مَسْجِدٌ, bentuk kata asalnya adalah ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'سَجَدَ'),
      jsonb_build_object('key', 'b', 'label', 'سَجِدَ'),
      jsonb_build_object('key', 'c', 'label', 'سَجُدَ')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 21, 'Kata عَمِلُوا terdiri dari huruf asli ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'عمل'),
      jsonb_build_object('key', 'b', 'label', 'عملو'),
      jsonb_build_object('key', 'c', 'label', 'عملوا')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 22, 'Kata الصالحات terdiri dari huruf asli ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'صلح'),
      jsonb_build_object('key', 'b', 'label', 'صلحات'),
      jsonb_build_object('key', 'c', 'label', 'الح')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 23, 'Kata الْمَبْثُوْثِ, terdiri dari huruf asli ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'بثث'),
      jsonb_build_object('key', 'b', 'label', 'بثوث'),
      jsonb_build_object('key', 'c', 'label', 'ثث')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 24, 'Kata يَشْعُرُوْنَ, terdiri dari huruf asli ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'شعر'),
      jsonb_build_object('key', 'b', 'label', 'يشعر'),
      jsonb_build_object('key', 'c', 'label', 'شعرون')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 25, 'Kata يُكَذِّبُ, terdiri dari huruf asli ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'كذب'),
      jsonb_build_object('key', 'b', 'label', 'كذبب'),
      jsonb_build_object('key', 'c', 'label', 'يكذب')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 26, 'Kata سَبِّحْ, termasuk ke dalam bab ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'فَعَّلَ'),
      jsonb_build_object('key', 'b', 'label', 'فَاعَلَ'),
      jsonb_build_object('key', 'c', 'label', 'أَفْعَلَ'),
      jsonb_build_object('key', 'd', 'label', 'تَفَعَّلَ')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 27, 'Kata يُكَذِّبُ, termasuk ke dalam bab ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'فَعَّلَ'),
      jsonb_build_object('key', 'b', 'label', 'فَاعَلَ'),
      jsonb_build_object('key', 'c', 'label', 'أَفْعَلَ'),
      jsonb_build_object('key', 'd', 'label', 'تَفَعَّلَ')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 28, 'Kata أَطْعَمَ, termasuk ke dalam bab ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'فَعَّلَ'),
      jsonb_build_object('key', 'b', 'label', 'فَاعَلَ'),
      jsonb_build_object('key', 'c', 'label', 'أَفْعَلَ'),
      jsonb_build_object('key', 'd', 'label', 'تَفَعَّلَ')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 29, 'Kata تَضْلِيْلٍ, termasuk ke dalam bab ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'فَعَّلَ'),
      jsonb_build_object('key', 'b', 'label', 'فَاعَلَ'),
      jsonb_build_object('key', 'c', 'label', 'أَفْعَلَ'),
      jsonb_build_object('key', 'd', 'label', 'تَفَعَّلَ')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 30, 'Kata أَرْسَلَ, termasuk ke dalam bab ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'فَعَّلَ'),
      jsonb_build_object('key', 'b', 'label', 'فَاعَلَ'),
      jsonb_build_object('key', 'c', 'label', 'أَفْعَلَ'),
      jsonb_build_object('key', 'd', 'label', 'تَفَعَّلَ')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 31, 'Kata إِخْلَاصٍ, termasuk ke dalam bab ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'إِفْعَالٌ'),
      jsonb_build_object('key', 'b', 'label', 'تَفْعِيْلٌ'),
      jsonb_build_object('key', 'c', 'label', 'مُفَاعَلَةٌ'),
      jsonb_build_object('key', 'd', 'label', 'تَفَعُّلٌ')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 32, 'Kata جِهَادٌ, termasuk ke dalam bab ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'إِفْعَالٌ'),
      jsonb_build_object('key', 'b', 'label', 'تَفْعِيْلٌ'),
      jsonb_build_object('key', 'c', 'label', 'مُفَاعَلَةٌ'),
      jsonb_build_object('key', 'd', 'label', 'تَفَعُّلٌ')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 33, 'Kata يُجَادِلُ, termasuk ke dalam bab ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'يُفْعِلُ'),
      jsonb_build_object('key', 'b', 'label', 'يُفَعِّلُ'),
      jsonb_build_object('key', 'c', 'label', 'يُفَاعِلُ'),
      jsonb_build_object('key', 'd', 'label', 'يَتَفَعَّلُ')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 34, 'Kata مُبَارَكٌ, termasuk ke dalam bab ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'مُفْعِلٌ'),
      jsonb_build_object('key', 'b', 'label', 'مُفَعِّلٌ'),
      jsonb_build_object('key', 'c', 'label', 'مُفَاعِلٌ'),
      jsonb_build_object('key', 'd', 'label', 'مُتَفَعِّلٌ')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 35, 'Jika fi''il "تَوَكَّلَ" dipindah ke fi''il mudhari'' dan ke "kalian laki-laki", maka menjadi ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'يَتَوَكَّلُونَ'),
      jsonb_build_object('key', 'b', 'label', 'تَتَوَكَّلُونَ'),
      jsonb_build_object('key', 'c', 'label', 'أَتَوَكَّلُ'),
      jsonb_build_object('key', 'd', 'label', 'تَوَكَّلْتُمْ')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 36, 'Jika isim "التَّكَاثُرُ" dipindah ke fi''il mudhari'' dan ke "kalian perempuan", maka menjadi ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'تَتَكَاثَرِينَ'),
      jsonb_build_object('key', 'b', 'label', 'تَتَكَاثَرْنَ'),
      jsonb_build_object('key', 'c', 'label', 'تَتَكَاثَرُونَ')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 37, 'Jika isim "الْمُتَنَافِسُونَ" dipindah ke fi''il madhi dan ke "kami", maka menjadi ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'تَنَافَسْنَا'),
      jsonb_build_object('key', 'b', 'label', 'تَنَافَسْتُمْ'),
      jsonb_build_object('key', 'c', 'label', 'تَنَافَسُوا')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 38, 'Jika fi''il "تَعَلَّمَ" dipindah ke fi''il amr dan ke "engkau perempuan", maka menjadi ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'تَعَلَّمِي'),
      jsonb_build_object('key', 'b', 'label', 'تَعَلَّمْنَ'),
      jsonb_build_object('key', 'c', 'label', 'تَعَلَّمَا'),
      jsonb_build_object('key', 'd', 'label', 'تَعَلَّمُوا')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 39, 'Jika fi''il "تَبَارَكَ" dipindah ke isim fa''il dan ke bentuk tunggal laki-laki, maka menjadi ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'مُتَبَارِكٌ'),
      jsonb_build_object('key', 'b', 'label', 'مُتَبَارَكٌ'),
      jsonb_build_object('key', 'c', 'label', 'تَبَارُكٌ')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 40, 'Jika isim "مُتَرَبِّصُونَ" dipindah ke fi''il madhi dan ke "kalian laki-laki", maka menjadi ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'تَرَبَّصْتُمْ'),
      jsonb_build_object('key', 'b', 'label', 'تَرَبَّصْنَا'),
      jsonb_build_object('key', 'c', 'label', 'تَرَبَّصُوا')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 41, 'Kata "انْقَلَبَ" jika dipindah ke bentuk fi''il amr dan ke "kalian laki-laki", maka menjadi ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'اِنْقَلِبْ'),
      jsonb_build_object('key', 'b', 'label', 'اِنْقَلِبَا'),
      jsonb_build_object('key', 'c', 'label', 'اِنْقَلِبُوا'),
      jsonb_build_object('key', 'd', 'label', 'اِنْقَلَبْتُمْ')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 42, 'Kata "ابْيَضَّ" jika dipindah ke bentuk fi''il mudhari'' dan ke "kami", maka menjadi ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'أَبْيَضُّ'),
      jsonb_build_object('key', 'b', 'label', 'نَبْيَضُّ'),
      jsonb_build_object('key', 'c', 'label', 'يَبْيَضُّ'),
      jsonb_build_object('key', 'd', 'label', 'تَبْيَضُّ')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 43, 'Kata "مُخْتَلِفُونَ" jika dikembalikan ke bentuk fi''il madhi dan ke "mereka laki-laki", maka menjadi ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'اخْتَلَفُوا'),
      jsonb_build_object('key', 'b', 'label', 'اخْتَلَفْتُمْ'),
      jsonb_build_object('key', 'c', 'label', 'اخْتَلَفْنَا')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 44, 'Kata "اسْتَكْبَرَ" jika dipindah ke bentuk fi''il amr dan ke "engkau perempuan", maka menjadi ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'اسْتَكْبِرِي'),
      jsonb_build_object('key', 'b', 'label', 'اسْتَكْبِرْ'),
      jsonb_build_object('key', 'c', 'label', 'اسْتَكْبِرَا'),
      jsonb_build_object('key', 'd', 'label', 'اسْتَكْبِرُوا')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 45, 'Kata "اسْتِغْفَارٌ" jika dikembalikan ke bentuk fi''il madhi dan ke "kami", maka menjadi ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'اسْتَغْفَرْنَا'),
      jsonb_build_object('key', 'b', 'label', 'اسْتَغْفَرُوا'),
      jsonb_build_object('key', 'c', 'label', 'اسْتَغْفَرْتُمْ')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 46, 'Kata "اقْتَرَبَ" jika dipindah ke bentuk fi''il mudhari'' dan ke "mereka laki-laki", maka menjadi ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'أَقْتَرِبُ'),
      jsonb_build_object('key', 'b', 'label', 'تَقْتَرِبُونَ'),
      jsonb_build_object('key', 'c', 'label', 'يَقْتَرِبُونَ')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 47, 'Bentuk mashdar dari عَلِمَ adalah ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'عِلْمٌ'),
      jsonb_build_object('key', 'b', 'label', 'مَعْلُومٌ'),
      jsonb_build_object('key', 'c', 'label', 'عَالِمٌ'),
      jsonb_build_object('key', 'd', 'label', 'مَعْلَمٌ')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 48, 'Bentuk isim fa''il dari عَلِمَ adalah ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'عَالِمٌ'),
      jsonb_build_object('key', 'b', 'label', 'مَعْلُومٌ'),
      jsonb_build_object('key', 'c', 'label', 'عِلْمٌ'),
      jsonb_build_object('key', 'd', 'label', 'عَلَّامٌ')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 49, 'Bentuk isim maf''ul dari عَلِمَ adalah ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'عَالِمٌ'),
      jsonb_build_object('key', 'b', 'label', 'مَعْلُومٌ'),
      jsonb_build_object('key', 'c', 'label', 'عِلْمٌ'),
      jsonb_build_object('key', 'd', 'label', 'مَعْلَمٌ')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  ),
  (
    target_exam_id, 50, 'Bentuk mashdar dari جَاهَدَ adalah ...', 'single_choice',
    jsonb_build_array(
      jsonb_build_object('key', 'a', 'label', 'جِهَادٌ'),
      jsonb_build_object('key', 'b', 'label', 'مُجَاهِدٌ'),
      jsonb_build_object('key', 'c', 'label', 'مَجْهُودٌ'),
      jsonb_build_object('key', 'd', 'label', 'جُهْدٌ')
    ),
    '[]'::jsonb, '[]'::jsonb, null, 2
  );
end $$;

commit;
