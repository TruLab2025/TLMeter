# TL Meter — zgodność planów (audyt egzekwowania)

Ten dokument odpowiada na pytanie: **czy to, co obiecujemy w planach (Lite/Pro/Premium), jest faktycznie egzekwowane technicznie**, czy tylko “ukryte w UI”.

## TL;DR (najważniejsze)

- **Licencja (token + PoP)** jest weryfikowana po stronie backendu *tylko tam, gdzie endpoint jest chroniony middleware*.
- Obecnie większość “funkcji premium” jest wykonywana **w przeglądarce** (DSP + raport + tipy), więc jeśli ktoś zmodyfikuje JS w swojej przeglądarce, może je odblokować lokalnie.
- Żeby plan był “nie do obejścia”, wynik premium musi być **generowany lub wydawany przez backend** (np. PDF, detailed tips, export PRO) i wymagać poprawnego tokenu.

## 1) Co dziś jest chronione “twardo” (backend)

| Obszar | Jak egzekwowane | Status |
|---|---|---|
| Token (podpis + exp + device_id + PoP) | `api/src/middleware/requireAccessToken.ts` | ✅ działa |
| Przykładowy endpoint chroniony | `POST /api/analyze` | ✅ chroniony, ale nieużywany w app |

## 2) Co dziś jest “miękkie” (front-only) — łatwe do obejścia

| Funkcja z planu | Gdzie dziś jest logika | Jak to obejść | Wniosek |
|---|---|---|---|
| Liczba sekcji wyników (`sectionsUnlocked`) | `lib/license.ts` (`PLAN_FEATURES`) + `app/analyze/page.tsx` | modyfikacja stanu/JS w przeglądarce | ❌ nie jest twardo egzekwowane |
| Podstawowe vs zaawansowane tipy (Basic/Detailed) | `app/analyze/page.tsx` (dobór tipów wg `session.plan`) | jw. | ❌ |
| Eksporty (FREE/LITE/PRO/PREM JSON) | jeśli export dzieje się w przeglądarce | jw. | ❌ jeśli nie ma endpointu |
| PDF | jeśli generowany w przeglądarce | jw. | ❌ jeśli nie ma endpointu |
| Historia / porównania | `lib/history.ts` (localStorage) | ręczna edycja storage | ❌ |

## 3) Co jest “pośrednie” (serwer istnieje, ale nie chroni planu)

| Obszar | Dziś | Ryzyko |
|---|---|---|
| Zapis analiz do API (`/api/analyses`) | publiczny zapis | plan nie ma znaczenia |
| Metryki do kalibracji (`/api/analyses/submit-metrics`) | publiczne | plan nie ma znaczenia |

## 4) Minimalny plan, żeby było zgodne z opisem planów (rekomendacja)

Jeśli w planach obiecujesz “realne” ograniczenia, to minimalnie:

1. **Wszystkie artefakty premium muszą przychodzić z backendu**:
   - PDF → `POST /api/reports/pdf` (chronione)
   - export PRO/PREM → `POST /api/exports/pro` (chronione)
   - detailed tips (jeśli nie chcesz zdradzać “pro wiedzy” w kliencie) → `POST /api/tips/detailed` (chronione)
2. Front może dalej liczyć metryki (dla UX), ale **to backend decyduje**, co wolno pobrać/wygenerować.
3. Jeśli wymagany jest limit urządzeń (1/2/3), potrzebujesz **minimalnego storage po stronie serwera (KV)** do liczenia aktywnych urządzeń per sub/klucz.

## 5) Definicja “zgodne z planem”

- “Zgodne” = użytkownik bez ważnego tokenu nie jest w stanie uzyskać premium artefaktu **z serwera**.
- Jeśli premium artefakt powstaje w przeglądarce, to każdy użytkownik może go sobie “wyprodukować” (to tylko kwestia chęci i DevTools).

