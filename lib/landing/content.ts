export const howItWorks = [
  {
    step: "1",
    title: "Miksujesz w DAW",
    desc: "Pracujesz nad swoim utworem w ulubionym DAW (Ableton, Logic, Reaper, Cubase). Po skończonym etapie zgrywasz miks (bounce) do formatu WAV, AIFF lub MP3.",
  },
  {
    step: "2",
    title: "Ładujesz do TL Meter",
    desc: "Wrzucasz plik do naszej aplikacji w przeglądarce. Wybierasz profil swojego brzmienia (np. Metal). Jeśli jesteś na pograniczu stylów, wybierz wykrywanie stylu. TL Meter błyskawicznie zdekoduje i zanalizuje sygnał.",
  },
  {
    step: "3",
    title: "Weryfikujesz błędy",
    desc: "Dostajesz pełne skanowanie: od głośności (LUFS), przez wykrywanie 'błota' w dolnej częstotliwości, po analizę męczących wysokich rejestrów (tzw. harshness). Wszystko z instrukcjami, co z tym faktem zrobić w miksie.",
  },
  {
    step: "4",
    title: "Wyciągasz wnioski",
    desc: "Wynik analizy, który otrzymasz, pokaże krok po kroku, co poprawić na ścieżkach i we wtyczkach DAW. Skopiuj plik JSON i wrzuć go do dowolnego asystenta AI, żeby jeszcze dokładniej analizować metryki Twojego miksu.",
  },
];

export const dictionary = [
  {
    term: "LUFS (Loudness Units relative to Full Scale)",
    desc: "Standard pomiaru głośności dopasowany do ludzkiego słyszenia. Decyduje o tym, jak mocno algorytmy serwisów streamingowych ściszą Twój utwór. Zbyt niska wartość to cichy miks, a zbyt wysoka to zgnieciona dynamika i ryzyko płaskiego brzmienia. Posiada kluczowe znaczenie przy odbiorze utworu na playliście.",
  },
  {
    term: "True Peak (dBTP)",
    desc: "Absolutnie najwyższy poziom sygnału audio. Konwersja do MP3 czy odtwarzanie na słabych głośnikach potrafi podbić najgłośniejsze skoki o ułamek decybela. Jeśli True Peak przekracza -0.3 dB, nagranie zacznie trzeszczeć zniekształceniami cyfrowymi.",
  },
  {
    term: "Dynamic Range / LRA",
    desc: "Loudness Range (LRA) mierzy różnicę między najcichszymi, a najgłośniejszymi fragmentami utworu. Duży LRA to miks 'oddychający' i kinowy. Mały LRA to popularna dla Metalu \"ściana dźwięku\", która daje kopa, ale łatwo potrafi zmęczyć słuchacza.",
  },
  {
    term: "Low End Balance",
    desc: "Odpowiedni stosunek energii uderzeń stopy i basu do reszty zestawu nagrania. Zbyt dużo dołu dusi energię utworu i zjada cenny cichy headroom (zapas głośności), powodując mulenie i dudnienie na innych sprzętach.",
  },
  {
    term: "Harshness Index",
    desc: "Psychoakustyczny indeks oznaczający kłujące wrzaski gitar i blach. Mierzy rejony 2-8 kHz, w których ludzkie ucho jest najbardziej czułe. Wysoki harshness sprawia, że słuchacz po 2 minutach przycisza muzykę, bo jest znużony.",
  },
  {
    term: "Stereo Width & Korelacja",
    desc: "Ocenia jak bardzo 'szeroki' jest utwór i czy w ogóle by zniknął na głośnikach z telefonu (tzw. badanie w MONO). Korelacja L-R poniżej zera oznacza powazne kolizje i kasowanie się kanałów.",
  },
];

export const librariesInfo = [
  {
    name: "WebAudio API",
    desc: "Służy nam za serce środowiska dekodowania sygnału bezpośrednio w RAM-ie z plików w przeglądarce za użyciem OfflineAudioContext.",
  },
  {
    name: "Custom TL DSP Engine",
    desc: "Stworzony od zera silnik w JS przez inżynierów z TruLab. Analizuje widmo metodą Transformacji Fouriera (FFT) na kawałki audio trwające 23 do 46ms, dostając w efekcie super-dokładne próbki.",
  },
  {
    name: "Meyda",
    desc: "Ogólnodostępna biblioteka do ekstrakcji cech dźwięku. Używamy jej, by wyciągnąć matematyczne dowody na temat Rolloffu, Flatness i Spectral Centroid dla sekcji średnich tonów.",
  },
  {
    name: "Essentia.js",
    desc: "Nadzwyczaj popularny w świecie akademickim framework zoptymalizowany pod WebAssembly. Umożliwia precyzyjną diagnozę psychoakustycznych zjawisk, z którymi walczą inżynierowie przy Masteringu.",
  },
];

export const plans = [
  {
    name: "Free",
    tagline: "Idealny do codziennej pracy",
    price: "0",
    color: "var(--text-secondary)",
    features: [
      "✅ Analiza plików MP3/AAC/M4A",
      "✅ Rozmiar pliku do 5 MB",
      "✅ 4 główne metryki miksu",
      "✅ 3 profile muzyczne",
      "✅Podstawowe porady DAW",
      "✅ Eksport FREE JSON",
      "❌ Porady DAW",
      "❌ WAV/AIFF/FLAC",
      "❌ Historia analiz",
      "❌ Porównania analiz / referencji",
      "**Bez limitu analiz**",
    ],
    cta: "Zacznij za darmo",
    ctaHref: "/analyze",
    highlight: false,
  },
  {
    name: "Lite",
    tagline: "Dobry do jakościowej analizy plików",
    price: "9",
    color: "#818cf8",
    features: [
      "✅ Analiza plików WAV/AIFF",
      "✅ Rozmiar pliku do 40 MB",
      "✅ 6 głównych metryk miksu",
      "✅ 6 profili muzyki+tryb auto",
      "✅ Podstawowe porady DAW",
      "✅ Eksport LITE JSON",
      "❌ Zaawansowane porady DAW",
      "❌ Historia analiz",
      "❌ Porównania analiz / referencji",
      "• 1 urządzenie",
      "**Bez limitu analiz**",
    ],
    cta: "Kup Lite",
    ctaHref: "/payment?plan=lite",
    highlight: false,
  },
  {
    name: "Pro",
    tagline: "Profesjonalne narzędzie inżyniera",
    price: "19",
    color: "var(--accent)",
    features: [
      "✅ Wszystko z Lite",
      "✅ Analiza plików FLAC/OGG",
      "✅ Rozmiar pliku do 80 MB",
      "✅ 6 metryk miksu+diagnoza",
      "✅ 12 profili muzyki+tryb auto",
      "✅ Zaawansowane porady DAW",
      "✅ Eksport PRO JSON",
      "✅ Historia ostatniej analizy",
      "✅ Porównanie z ostatnią analizą",
      "• 2 urządzenia",
      "**Bez limitu analiz**",
    ],
    cta: "Kup Pro",
    ctaHref: "/payment?plan=pro",
    highlight: true,
  },
  {
    name: "Premium",
    tagline: "Najlepsze dla top producenta muzyki",
    price: "29",
    color: "#f59e0b",
    features: [
      "✅ Wszystko z Pro",
      "✅ Analiza wielu typów plików",
      "✅ Rozmiar pliku do 100 MB",
      "✅ Komplet metryk miksu+diagnoza",
      "✅ Komplet profili myzyki+tryb auto",
      "✅ Zaawansowane porady DAW",
      "✅ Eksport PREM JSON",
      "✅ Pełna historia analiz",
      "✅ Porównania analiz / referencji",
      "• 3 urządzenia",
      "**Bez limitu analiz**",
    ],
    cta: "Kup Premium",
    ctaHref: "/payment?plan=premium",
    highlight: false,
  },
];

export const faq = [
  {
    q: "Dlaczego mam używać TL Meter, a nie pluginu VST?",
    a: "TL Meter nie obciąża procesora Twojego DAW ani nie spowalnia miksu. Skupiasz się na muzyce, eksportujesz ślad i diagnozujesz go pod względem problemów, patrząc całościowo i nie domyślając się z wykresików w pluginach wielozadaniowych.",
  },
  {
    q: "Co to jest DSP i na czym polega ta analiza?",
    a: "DSP to Digital Signal Processing — cyfrowe przetwarzanie sygnału audio. TL Meter wykorzystuje algorytmy DSP do rozkładania Twojego miksu na częstotliwości (FFT - Fast Fourier Transform), mierzenia głośności według standardu EBU R128, wykrywania szczytów True Peak i analizy balansu spektralnego. Wszystko odbywa się w czasie rzeczywistym w przeglądarce, bez potrzeby instalacji oprogramowania czy wysyłania plików na serwer.",
  },
  {
    q: "Czy moje pliki audio są wysyłane na serwer?",
    a: "Nie. Analiza działa w 100% w Twojej przeglądarce (WebAudio API). Plik nigdy nie opuszcza Twojego komputera, a TruLab nie ma do niego dostępu.",
  },
  {
    q: "Jakie formaty są obsługiwane?",
    a: "WAV i AIFF dają najlepsze wyniki (audio bez strat o najlepszej jakości skanowania). MP3 i AAC również działają, ale wiedz ucinają pasmo i powodują piki w True Peak.",
  },
  {
    q: "Jak działa system kodów aktywacyjnych?",
    a: "Po zakupie otrzymujesz email z unikalnym kodem. Wklejasz go w aplikacji — kod zostaje powiązany z odciskiem palca logiki Twojego sprzętu i przeglądarki. Pożegnaj się z nudnymi logowaniami i hasłami.",
  },
  {
    q: "Dla kogo jest przeznaczony TL Meter?",
    a: "Dla amatorów i domowych producentów, którzy realizują swoje wymarzone utwory bez wsparcia inżynierów. Stworzyliśmy go, bo szukaliśmy sprawnego narzędzia w przeglądarce, aby poprawić jakość i nie musieć domyślać się usterek ze skomplikowanych wykresów po odpaleniu 10 rożnych wtyczek.",
  },
  {
    q: "Czy mogę używać TL Meter na więcej niż jednym komputerze?",
    a: "Tak, zależnie od kupionego na stałe planu: Lite pozwala zapamiętać przeglądarkę na 1 urządzeniu z jednoczesną pracą, Pro dotyczy 2 urządzeń (np Mac i iPhone), Premium pozwala na 3.",
  },
];

export const testimonials = [
  {
    name: "Mateusz",
    role: "Gitarzysta Producent",
    text: "W 5 minut naprawiłem dudniący bas w swoim miksie. Genialne narzędzie dla każdego, kto nie ma budżetu na mastering.",
  },
  {
    name: "Piotr Kowalski",
    role: "Hobbysta, Beatmaker",
    text: "Zawsze bałem się, że brzmię za cicho w aucie i wyrzucam pieniądze w błoto, to rozwiązanie mnie wyręczyło z lęku.",
  },
  {
    name: "Lena Witkowska",
    role: "Wokalistka",
    text: "Nareszcie wiem dlaczego moje blachy kłuły po uszach. Uratowało to kilka piosenek z epki zespołu.",
  },
  {
    name: "Arkadiusz S.",
    role: "Garażowy Producent",
    text: "Mega pomocne DAW tipy. Jako początkujący nie mam idealnego słuchu, a ten skaner obiektywnie podpowiada EQ.",
  },
  {
    name: "Danny",
    role: "Basista rockowy",
    text: "Rewolucja w wypuszczaniu demówek. Kiedyś się wstydziłem wrzucać szkice na grupę, teraz filtruję je tu wcześniej.",
  },
  {
    name: "Julia K.",
    role: "Indie Pop Artist",
    text: "Przestałam korzystać z subskrypcji drogich pluginów iZotope, bo TL Meter pokazuje mi palcem co zepsułam.",
  },
];
