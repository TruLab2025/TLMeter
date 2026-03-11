# TruLab Meter - Calibration System - Quick Start

## 📦 Co zawiera system

Kompletny system kalibracji algorytmu analizy miksu dla aplikacji TL Meter, działającej w przeglądarce.

### Moduły:

1. **Types** (`types.ts`) - Wszystkie interfejsy TypeScript
2. **Percentiles** (`percentiles.ts`) - Obliczanie i walnikowanie percentyli
3. **Profiles** (`profiles.ts`) - Profile stylów (rock, metal, pop, edm, grunge)
4. **Diagnosis** (`diagnosis.ts`) - Logika diagnozy i rekomendacji
5. **Aggregation** (`aggregation.ts`) - Zbieranie metryki od użytkowników
6. **Config** (`config.ts`) - Konfiguracja systemu
7. **Examples** (`examples.ts`) - Przykłady i testy integracyjne

## 🚀 Szybki start

### 1. Importuj system

```typescript
import { analyzeAndDiagnose, recordAnalysis } from "@/lib/calibration";
```

### 2. Po analizie DSP wyciągni z przeglądarki:

```typescript
// Metryki z DSP engine (25+ wartości)
const metrics: AnalysisMetrics = {
  lufs: -9.2,
  true_peak: -1.0,
  low_ratio: 0.24,
  mid_ratio: 0.31,
  high_ratio: 0.12,
  stereo_width: 0.93,
  harshness_index: 35,
  // ... i 18 więcej
};

// Zdiagnozuj miks
const diagnosis = await analyzeAndDiagnose(metrics, "rock");

console.log(diagnosis.overall_score); // 0-100
console.log(diagnosis.issues); // Problemy
console.log(diagnosis.daw_tips); // DAW porady EQ/Compressor
```

### 3. Wyślij metryki do agregacji (opcjonalnie)

```typescript
await recordAnalysis(metrics, "rock");
// Trafia do zbioru do agregacji profili
```

### 4. Wyswietl użytkownikowi

```tsx
<div className="diagnosis">
  <div className="score">{diagnosis.overall_score}%</div>
  
  {diagnosis.issues.map(issue => (
    <div className={`issue ${issue.severity}`}>
      {issue.title}
      <p>{issue.description}</p>
    </div>
  ))}
  
  {diagnosis.daw_tips.map(tip => (
    <div className="tip">
      <strong>{tip.tool}</strong> @ {tip.frequency}
      <span>{tip.action} {tip.problem}</span>
    </div>
  ))}
</div>
```

## 📊 Profile stylów

Domyślnie dostępne:

```
rock       - Classic, hard, alternative rock
metal      - Heavy, thrash, death metal
grunge     - Grunge, post-grunge
pop        - Pop, indie pop
edm        - Electronic, house, techno, drum & bass
```

Każdy profil zawiera percentyle dla 19 metryk.

## 🔍 Dostępne metryki

**Głośność:**
- `lufs` - Integrated LUFS (standard EBU R128)
- `true_peak` - Szczyt sygnału (dBTP)
- `momentary_loudness` - Głośność chwilowa

**Spektrum:**
- `low_ratio` - Energia 60-250 Hz
- `low_mid_ratio` - Energia 250-500 Hz
- `mid_ratio` - Energia 500-2k Hz
- `mid_high_ratio` - Energia 2k-5k Hz (presence)
- `high_ratio` - Energia 5k-20k Hz
- `spectral_centroid` - "Ciężar" spektralny (Hz)
- `spectral_tilt` - Nachylenie spektrum (dB/octave)

**Stereo:**
- `stereo_correlation` - Podobieństwo L/R
- `stereo_width` - Szerokość pola stereo

**Psychoakustyka:**
- `harshness_index` - Kłujące wysokości (2-8 kHz)
- `brightness_index` - Jasność (8-20 kHz)
- `warmth_index` - Ciepło (60-250 Hz)

**Dynamika:**
- `transient_density` - Liczba ataków/sec
- `crest_factor` - Peak/RMS ratio

## 🎯 Wynik diagnozy

```typescript
{
  style: "rock",
  overall_score: 78,
  
  diagnoses: [
    {
      metric_name: "harshness_index",
      user_value: 38,
      p10: 20,
      p50: 35,
      p90: 50,
      status: "optimal",
      confidence: 0.78,
      message: "Harshness Index jest w świetnym zakresie...",
      recommendation: "Dobrze! Utrzymaj obecne ustawienia."
    },
    // ...
  ],
  
  issues: [
    {
      severity: "medium",
      title: "Midrange poniżej normy",
      description: "...",
      affected_metrics: ["mid_ratio", "mid_high_ratio"]
    }
  ],
  
  strengths: ["Spectral Centroid jest doskonały"],
  
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

## 🔄 Agregacja danych

Metryki są zbierane (anonimowo) i agregowane w celu:
1. Ulepsszenia profili stylów
2. Statystycznej walidacji algorytmu
3. Detekcji zmian w trendach

**Przesyłane dane:**
- ✅ Metryki (19+ liczb)
- ✅ Styl muzyki
- ✅ Wersja algorytmu
- ❌ Audio
- ❌ Nazwy plików
- ❌ Nazwy artystów
- ❌ ID użytkowników

**Endpoint:**
```
POST /api/analyses/submit-metrics
{
  "style": "rock",
  "metrics": { ... }
}
```

## 🧪 API Endpoint

### Submit Metrics

```bash
curl -X POST http://localhost:3000/api/analyses/submit-metrics \
  -H "Content-Type: application/json" \
  -d '{
    "style": "rock",
    "metrics": {
      "lufs": -9.2,
      "true_peak": -1.0,
      "low_ratio": 0.24,
      ...
    }
  }'
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

## 🧠 Logika percentyli

**Status metryki:**
- `p10...p90` = zakres (optimal) ✅
- `< p10` = low ⚠️
- `> p90` = high ⚠️
- `< p10 - 3σ` = critical_low ❌
- `> p90 + 3σ` = critical_high ❌

**Confidence:**
- Wyższa = bardziej pewny
- Oparta na Kurtalności rozkładu

## 📚 Testy

```typescript
import { integrationTest, runAllExamples } from "@/lib/calibration/examples";

// Uruchom integrację test
await integrationTest(); // Pełny test wszystkich funkcji

// Uruchom wszystkie przykłady
await runAllExamples();
```

## 🔧 Konfiguracja

Default weights metryki w overall score:

```typescript
metric_weights: {
  lufs: 1.0,        // Krytyczna
  harshness_index: 1.0, // Krytyczna
  mid_ratio: 1.0,   // Krytyczna
  stereo_width: 0.8, // Ważna
  true_peak: 0.95,  // Ważna
  // ...
}
```

Progi diagnostyki:
- `optimal`: p25...p75
- `warning`: p10...p90

## 🚀 Integracja w produkcji

1. **Frontend** (app/analyze/page.tsx):
```typescript
import { analyzeAndDiagnose } from "@/lib/calibration";

// Po DSP:
const diagnosis = await analyzeAndDiagnose(metrics, style);
// Wyświetl diagnosis.overall_score, issues, daw_tips
```

2. **Backend** - endpoint już gotowy
```typescript
POST /api/analyses/submit-metrics
```

3. **Agregacja** - job (codziennie):
```typescript
import { aggregateAllStyles } from "@/lib/calibration";

// Scheduled job:
await aggregateAllStyles();
```

## 📈 Metryki = dane do AI

Użytkownik może wyeksportować JSON:
```json
{
  "style": "rock",
  "metrics": { ... }
}
```

Wkleić do ChatGPT/Claude:
> "Oto liczby z analizy mojego mixu. Co mogę poprawić?"

## 🎓 Architektura

```
App (Browser)
  ├─ DSP Analysis (local)
  │  └─ 25+ metrics
  │
  └─ Calibration System
     ├─ getStyleProfile("rock")
     ├─ analyzeAndDiagnose(metrics, style)
     ├─ recordAnalysis(metrics, style)
     └─ diagnosis + issues + daw_tips

Server (Node)
  └─ POST /api/analyses/submit-metrics
     ├─ Validate
     ├─ Store (in-memory or DB)
     ├─ calculateAggregation()
     └─ updateStyleProfile()
```

---

**Wersja:** 1.0  
**Status:** Production Ready  
**Automatyczne aktualizacje:** Tak (via user metrics)
