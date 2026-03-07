# TruLab Meter - System Kalibracji Algorytmu Analizy Miksu

## Architektura

System kalibracji umożliwia:

1. **Analizę audio lokalnie w przeglądarce** (DSP w sieci)
2. **Porównanie z profilami stylów muzycznych** (percentyle statystyczne)
3. **Diagnozę problemów miksu** z rekomendacjami
4. **Agregację anonimowych metryk** z użytkowników
5. **Aktualizację profili** na podstawie rosnącej bazy danych

## Struktura modułów

```
lib/calibration/
├── types.ts           # Interfejsy TypeScript
├── percentiles.ts     # Obliczanie i porównywanie percentyli
├── profiles.ts        # Profile stylów muzycznych
├── diagnosis.ts       # Logika diagnozy miksu
├── aggregation.ts     # Zbieranie i agregacja metryki
└── index.ts           # Eksport i API
```

## Przykłady użycia

### 1. Uzyskaj profil stylu

```typescript
import { getStyleProfile } from "@/lib/calibration";

const profile = await getStyleProfile("rock");
console.log(profile.metrics.lufs); // { p10: -11, p50: -9, p90: -7, ... }
```

### 2. Zdiagnozuj miks

```typescript
import { analyzeAndDiagnose } from "@/lib/calibration";

const diagnosis = await analyzeAndDiagnose(
  {
    lufs: -8.5,
    true_peak: -1.2,
    low_ratio: 0.25,
    mid_ratio: 0.32,
    high_ratio: 0.11,
    stereo_width: 0.89,
    harshness_index: 38,
    // ... inne metryki
  },
  "rock"
);

console.log(diagnosis.overall_score); // np. 78
console.log(diagnosis.issues); // Tablica problemów
console.log(diagnosis.daw_tips); // Konkretne porady EQ
```

### 3. Wyślij metrykę do agregacji

```typescript
import { recordAnalysis } from "@/lib/calibration";

// Po analizie w przeglądarce:
await recordAnalysis(metrics, "rock");
// Metryka trafia do zbioru agregacji
```

### 4. Pobierz statystykę agregacji

```typescript
import { getAggregationStats } from "@/lib/calibration";

const stats = getAggregationStats();
console.log(stats.records_by_style);
// { rock: 45, metal: 32, pop: 28, ... }
```

### 5. Oblicz percentyle z custom zbioru

```typescript
import { calculatePercentiles } from "@/lib/calibration";

const values = [-9.2, -8.8, -9.5, -8.9, -10.1, -8.5, -9.3];
const percentiles = calculatePercentiles(values);
console.log(percentiles);
// {
//   p10: -10.04,
//   p50: -9.2,
//   p90: -8.62,
//   mean: -9.19,
//   std_dev: 0.61,
//   count: 7
// }
```

## Dostępne style

```typescript
import { getAvailableStyles } from "@/lib/calibration";

const styles = getAvailableStyles();
// ["rock", "metal", "grunge", "pop", "edm"]
```

## API Endpoint

### `POST /api/analyses/submit-metrics`

Wysyła anonimowe metryki na serwer.

**Request:**
```json
{
  "style": "rock",
  "metrics": {
    "lufs": -9.2,
    "true_peak": -1.0,
    "low_ratio": 0.24,
    "mid_ratio": 0.31,
    "high_ratio": 0.12,
    "stereo_width": 0.93,
    "harshness_index": 35,
    ...
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Metrics submitted successfully",
  "aggregation_stats": {
    "total_records": 42,
    "records_by_style": {
      "rock": 20,
      "metal": 15,
      "pop": 7
    }
  }
}
```

## Dane w diagnozach

Każda diagnoza zawiera:

```typescript
{
  // Podstawowe info
  style: "rock",
  overall_score: 78, // 0-100
  
  // Szczegółowe diagnozy per metryka
  diagnoses: [
    {
      metric_name: "harshness_index",
      user_value: 38,
      p10: 20,
      p50: 35,
      p90: 50,
      status: "optimal", // "optimal" | "low" | "high" | "critical_low" | "critical_high"
      confidence: 0.78,
      message: "Harshness Index jest w świetnym zakresie...",
      recommendation: "Dobrze! Utrzymaj obecne ustawienia."
    }
  ],
  
  // Zagregowane problemy
  issues: [
    {
      severity: "medium",
      title: "Midrange poniżej normy",
      description: "2 elementy w kategorii Spektrum mają zbyt niskie wartości.",
      affected_metrics: ["mid_ratio", "mid_high_ratio"]
    }
  ],
  
  // Pozytywne aspekty
  strengths: [
    "Spectral Centroid jest doskonały",
    "Stereo Width jest doskonały"
  ],
  
  // DAW Tips
  daw_tips: [
    {
      problem: "Mid Ratio",
      tool: "EQ",
      frequency: "500-2k Hz",
      action: "Zwiększ"
    }
  ]
}
```

## Logika percentyli

**Ocena metryki:**
- `p10` - 10. percentyl (dół zakresu)
- `p25, p50 (mediana), p75` - rozdzielniki
- `p90` - 90. percentyl (góra zakresu)

**Statusy:**
- `optimal` - w zakresie p10-p90 ✅
- `low` - poniżej p10 ⚠️
- `high` - powyżej p90 ⚠️
- `critical_low` - znacznie poniżej (poza 3σ) ❌
- `critical_high` - znacznie powyżej (poza 3σ) ❌

## Update profili

Profil jest kombinacją:
- **60% curated data** - ręcznie wybrane referentne utwory
- **40% user data** - anonimowe metryki z użytkowników

Aktualizacja zachodzi poprzez:
1. Zbieranie metryk z `/api/analyses/submit-metrics`
2. Obliczenie percentyli dla każdego stylu
3. Scalenie z danymi curated
4. Update profilu w DB (w produkcji)

## Struktury danych kluczowe

### AnalysisMetrics
Wyjście DSP z przeglądarki (17+ metryk):
- Głośność: `lufs`, `true_peak`, `momentary_loudness`
- Spektrum: `low_ratio`, `mid_ratio`, `high_ratio`, spectral cenroi, itp.
- Stereo: `stereo_correlation`, `stereo_width`
- Psychoakustyka: `harshness_index`, `brightness_index`, `warmth_index`

### MetricsRecord
Anonimowy zapis single analizy (nie zawiera: audio, filename, artist, user id)

### StyleProfile
Profil referencyjny dla stylu (zawiera percentyle dla każdej metryki)

### MixDiagnosis
Wynik diagnozy z problemami, rekomendacjami i DAW tips

## Prywatność

Zapisane są **tylko** metryki statystyczne:
- ❌ Audio
- ❌ Nazwy plików
- ❌ Nazwy artystów
- ❌ ID użytkowników
- ✅ Nazwa stylu
- ✅ Metryki DSP (25+ wartości liczb)
- ✅ Wersja algorytmu

## Testowanie

```typescript
import { 
  clearMetricsStore, 
  getMetricsStoreDebug,
  getAggregationStats 
} from "@/lib/calibration";

// Wyczyść dane testowe
clearMetricsStore();

// Pobierz surowe rekordy (debug)
const records = getMetricsStoreDebug();

// Sprawdź statystykę
const stats = getAggregationStats();
```

## Integracja z aplikacją

W `app/analyze/page.tsx`:

```typescript
import { recordAnalysis, analyzeAndDiagnose } from "@/lib/calibration";

// Po analizie DSP:
const metrics = await dspEngine.analyze(audioBuffer);

// Zdiagnozuj
const diagnosis = await analyzeAndDiagnose(metrics, selectedStyle);

// Wyślij do agregacji (opcjonalnie)
await recordAnalysis(metrics, selectedStyle);

// Wyświetl diagnosis.overall_score, issues, daw_tips
```

## Future enhancements

1. Persystencja w bazie danych (aktualnie in-memory)
2. Batch aggregation job (co 24h)
3. Versioning profili (A/B testing)
4. Machine learning na percentylach
5. Custom user profiles (dla zespołów studia)
