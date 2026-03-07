/**
 * Reference Detection System
 * Identyfikuje czy uploadowany plik to referencja dla danego stylu
 * 
 * Strategie:
 * 1. Znana baza referencyjnych artystów/zespołów per styl
 * 2. Parsing nazwy pliku (heurystyka)
 * 3. Manual confirmation od użytkownika (UI checkbox)
 */

/**
 * Znane referencyjne artysty/zespoły per styl muzyki
 */
const REFERENCE_ARTISTS: Record<string, Set<string>> = {
  rock: new Set([
    // Classic Rock
    "pink floyd",
    "the beatles",
    "led zeppelin",
    "the rolling stones",
    "queen",
    "david bowie",
    "the who",
    
    // Hard Rock
    "ac/dc",
    "aerosmith",
    "deep purple",
    "black sabbath",
    
    // Modern Rock
    "radiohead",
    "the strokes",
    "arctic monkeys",
    "foo fighters",
    "red hot chili peppers",
  ]),

  metal: new Set([
    // Thrash Metal
    "metallica",
    "slayer",
    "megadeth",
    "anthrax",
    
    // Death Metal
    "death",
    "morbid angel",
    "sepultura",
    
    // Modern Metal
    "lamb of god",
    "killswitch engage",
    "trivium",
    "avenged sevenfold",
  ]),

  grunge: new Set([
    "nirvana",
    "soundgarden",
    "alice in chains",
    "pearl jam",
    "stone temple pilots",
    "mudhoney",
    "screaming trees",
  ]),

  pop: new Set([
    "the weeknd",
    "taylor swift",
    "ariana grande",
    "dua lipa",
    "ed sheeran",
    "billie eilish",
    "drake",
    "the 1975",
  ]),

  edm: new Set([
    "daft punk",
    "deadmau5",
    "david guetta",
    "tiësto",
    "calvin harris",
    "skrillex",
    "diplo",
    "porter robinson",
    "grimes",
  ]),
};

/**
 * Referencyjne piosenki (znane tytuły per styl)
 */
const REFERENCE_SONGS: Record<string, Set<string>> = {
  rock: new Set([
    "bohemian rhapsody",
    "stairway to heaven",
    "hotel california",
    "comfortably numb",
    "smells like teen spirit",
    "layla",
    "love me two times",
  ]),

  metal: new Set([
    "master of puppets",
    "raining blood",
    "symphony of destruction",
    "enter sandman",
    "painkiller",
  ]),

  grunge: new Set([
    "smells like teen spirit",
    "black hole sun",
    "down on the level",
    "alive",
    "rooster",
  ]),

  pop: new Set([
    "blinding lights",
    "shape of you",
    "levitating",
    "watermelon sugar",
    "drivers license",
  ]),

  edm: new Set([
    "around the world",
    "get lucky",
    "animals",
    "scary monsters and nice sprites",
  ]),
};

/**
 * Heurystyka: Parse filename na artystę/tytuł
 * Wspiera formaty:
 * - "Artist - Title.wav"
 * - "Artist_-_Title.wav"
 * - "rock_reference_Artist_Title.wav"
 * - "[style]_reference_[artist]_[title].wav"
 */
export function parseFilename(filename: string): {
  artist: string | null;
  title: string | null;
  style: string | null;
} {
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");

  // Format: "[style]_reference_[artist]_[title]"
  const refMatch = nameWithoutExt.match(
    /^(rock|metal|grunge|pop|edm)_reference_(.+?)_(.+)$/i
  );
  if (refMatch) {
    return {
      style: refMatch[1].toLowerCase(),
      artist: refMatch[2].replace(/_/g, " ").toLowerCase().trim(),
      title: refMatch[3].replace(/_/g, " ").toLowerCase().trim(),
    };
  }

  // Format: "Artist - Title" lub "Artist_-_Title"
  const dashMatch = nameWithoutExt.match(/^(.+?)\s*[-–]\s*(.+)$/);
  if (dashMatch) {
    return {
      artist: dashMatch[1].replace(/_/g, " ").toLowerCase().trim(),
      title: dashMatch[2].replace(/_/g, " ").toLowerCase().trim(),
      style: null,
    };
  }

  return {
    artist: null,
    title: null,
    style: null,
  };
}

/**
 * Detectuj czy plik to referencja dla danego stylu
 * Zwraca confidence score (0-1) i reason
 */
export function detectIfReference(
  filename: string,
  selectedStyle: string
): {
  isReference: boolean;
  confidence: number;
  reason: string;
  artist: string | null;
  title: string | null;
  selectedStyle: string;
  matchedStyle: string | null;
  matchType: "style-marker" | "known-artist" | "known-song" | "other-style-artist" | "none";
} {
  const parsed = parseFilename(filename);

  // Level 1: Explicit style marker w filename
  if (parsed.style && parsed.style === selectedStyle) {
    return {
      isReference: true,
      confidence: 0.95,
      reason: `Filename wskazuje style: ${selectedStyle}`,
      artist: parsed.artist,
      title: parsed.title,
      selectedStyle,
      matchedStyle: parsed.style,
      matchType: "style-marker",
    };
  }

  // Level 2: Known artist w bazie dla tego stylu
  if (parsed.artist) {
    const artistSet = REFERENCE_ARTISTS[selectedStyle];
    if (artistSet?.has(parsed.artist)) {
      return {
        isReference: true,
        confidence: 0.85,
        reason: `Znany artysta dla ${selectedStyle}: ${parsed.artist}`,
        artist: parsed.artist,
        title: parsed.title,
        selectedStyle,
        matchedStyle: selectedStyle,
        matchType: "known-artist",
      };
    }
  }

  // Level 3: Known song w bazie dla tego stylu
  if (parsed.title) {
    const songsSet = REFERENCE_SONGS[selectedStyle];
    if (songsSet?.has(parsed.title)) {
      return {
        isReference: true,
        confidence: 0.8,
        reason: `Znana piosenka dla ${selectedStyle}: ${parsed.title}`,
        artist: parsed.artist,
        title: parsed.title,
        selectedStyle,
        matchedStyle: selectedStyle,
        matchType: "known-song",
      };
    }
  }

  // Level 4: Artist znany w jakimkolwiek innym stylu (możliwy false positive)
  if (parsed.artist) {
    for (const [style, artists] of Object.entries(REFERENCE_ARTISTS)) {
      if (style !== selectedStyle && artists.has(parsed.artist)) {
        return {
          isReference: false,
          confidence: 0.3,
          reason: `Artysta znany z innego stylu (${style}), nie ${selectedStyle}`,
          artist: parsed.artist,
          title: parsed.title,
          selectedStyle,
          matchedStyle: style,
          matchType: "other-style-artist",
        };
      }
    }
  }

  return {
    isReference: false,
    confidence: 0,
    reason: "Plik nie rozpoznany jako referencja",
    artist: parsed.artist,
    title: parsed.title,
    selectedStyle,
    matchedStyle: null,
    matchType: "none",
  };
}

/**
 * Pobierz listę znanych stylów
 */
export function getKnownStyles(): string[] {
  return Object.keys(REFERENCE_ARTISTS);
}

/**
 * Dodaj artystę do bazy referencyjnej
 * (Dla future: admin panel do zarządzania bazą)
 */
export function addReferenceArtist(style: string, artist: string): void {
  const normalized = artist.toLowerCase().trim();
  if (!REFERENCE_ARTISTS[style]) {
    REFERENCE_ARTISTS[style] = new Set();
  }
  REFERENCE_ARTISTS[style].add(normalized);
}

/**
 * Sprawdź czy artysta jest w bazie
 */
export function isKnownArtist(style: string, artist: string): boolean {
  return REFERENCE_ARTISTS[style]?.has(artist.toLowerCase().trim()) ?? false;
}

/**
 * Debug: Weź wszystkie znane artysty dla stylu
 */
export function getKnownArtistsForStyle(style: string): string[] {
  return Array.from(REFERENCE_ARTISTS[style] ?? []).sort();
}
