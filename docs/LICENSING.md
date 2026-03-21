# TL Meter — klucze dostępu (30 dni) — manual

Ten dokument opisuje **jak działają kody/klucze aktywacyjne TL Meter** w wersji *bez kont użytkowników i bez bazy danych* (system stateless).

## 1) Jak to działa (w skrócie)

- Po zakupie otrzymujesz **klucz dostępu** (ciąg znaków).
- Po aktywacji klucz odblokowuje funkcje płatne na **30 dni**.
- Klucz działa **na tym samym urządzeniu/przeglądarce**, w której został aktywowany.
- Po 30 dniach dostęp **wygasa automatycznie**.
- Przy odnowieniu subskrypcji dostajesz **nowy klucz** (z nową datą ważności).

W tym modelu nie ma logowania ani kont — **to klucz jest “biletem” do funkcji premium**.

## 2) Co oznacza “urządzenie”

W praktyce “urządzenie” to **konkretny browser + profil przeglądarki** (np. Chrome na Twoim laptopie).

TL Meter zapisuje na pierwszej wizycie identyfikator urządzenia `tlm_device_id` w pamięci przeglądarki (localStorage).
Dodatkowo generuje parę kluczy kryptograficznych (PoP) i trzyma klucz prywatny w IndexedDB (nie jest wysyłany na serwer).

Skutki:

- Ten sam komputer, ale inna przeglądarka → traktowane jak inne urządzenie.
- Tryb incognito / prywatny → zwykle nowe urządzenie.
- Wyczyścisz dane przeglądarki (cookies/localStorage) → aplikacja “zapomni” urządzenie i klucz może przestać działać.

## 3) Aktywacja — krok po kroku (dla użytkownika)

1. Skopiuj klucz, który dostałeś po zakupie.
2. Wejdź na stronę aktywacji: `/activate`.
3. Wklej klucz i kliknij **Aktywuj**.
4. Po aktywacji przejdź do `/analyze` — funkcje płatne będą odblokowane do momentu wygaśnięcia.

## 3a) Ważne: zakup na właściwym urządzeniu

Klucz jest wiązany z “urządzeniem” (Twoją przeglądarką). To oznacza, że:

- jeśli kupisz na telefonie, a chcesz używać na komputerze, najprościej **dokończ aktywację na komputerze** (wklej klucz z maila na `/activate` w przeglądarce, w której będziesz używać TL Meter),
- jeśli wyczyścisz dane przeglądarki/zmienisz browser, aplikacja może wymagać ponownego wystawienia klucza dla tego urządzenia.

## 4) Odnowienie / nowy klucz

Przy odnowieniu subskrypcji otrzymujesz **nowy klucz**. Stary klucz:

- nie jest “wyłączany” ręcznie,
- po prostu **wygasa sam** po czasie ważności.

Jeśli chcesz przedłużyć dostęp wcześniej, po prostu aktywujesz nowy klucz (najczęściej nadpisze poprzedni w przeglądarce).

## 5) Czego NIE da się zrobić bez serwerowego storage (ważne)

Model “bez DB” jest prosty, ale ma ograniczenia, jeśli nie trzymamy żadnego stanu po stronie serwera.
W TL Meter docelowo używamy lekkiego storage (KV / pliki) do:

- limitu urządzeń w planie (1/2/3),
- (opcjonalnie) revokacji i resetu urządzeń.

- Brak cofania klucza “w trakcie” (brak revokacji) — klucz działa do `exp`.
- Brak “odzyskiwania dostępu” przez login — jeśli zgubisz klucz, trzeba wygenerować nowy.

## 6) Najczęstsze problemy (FAQ)

**A) “Klucz nie działa / Błąd aktywacji”**
- Upewnij się, że wklejasz cały klucz (bez spacji na początku/końcu).
- Spróbuj wkleić w tej samej przeglądarce, w której normalnie korzystasz z TL Meter.
- Jeśli czyściłeś dane przeglądarki, klucz może wymagać ponownego wydania.

**B) “Działało, ale przestało”**
- Najczęściej: minęła data ważności (30 dni) albo wyczyszczono localStorage.
- Rozwiązanie: aktywuj nowy klucz (odnowienie).

**C) Chcę używać na drugim urządzeniu**
- W systemie “bez kont” najprościej: potrzebujesz **osobnego klucza** dla drugiego urządzenia (albo klucza wydanego dla tego urządzenia).
  - Jeśli Twój plan obejmuje więcej niż 1 urządzenie (np. Pro = 2), możesz dodać kolejne urządzenie przez **parowanie urządzeń** (krótki kod wygenerowany na aktywnym urządzeniu).

> Uwaga dla dev: w repo może istnieć starszy endpoint aktywacji “kodu” oparty o DB (`/api/license/activate`). W docelowym trybie stateless nie jest on potrzebny — używamy tokenów i `validate-token`.

## 7) Prywatność

- System nie wymaga konta ani e-maila do samej weryfikacji klucza w aplikacji.
- Przeglądarka przechowuje tylko lokalny identyfikator `tlm_device_id` oraz klucz (token) w localStorage.

---

# Dla zespołu (implementacja techniczna)

## A) Format klucza (token)

Klucz jest podpisanym tokenem w formacie:

`payload_b64url.signature_b64url`

Gdzie:

- `payload_b64url` = base64url(JSON payload)
- `signature_b64url` = base64url(HMAC_SHA256(payload_b64url, LICENSE_TOKEN_SECRET))

Payload (minimalny):

```json
{
  "device_id": "uuid-string",
  "device_pub": "base64url-spki",
  "plan": "pro",
  "exp": 1760000000
}
```

- `exp` to unix timestamp w **sekundach**.

## B) Sekret

- Sekret HMAC jest wyłącznie na backendzie: `LICENSE_TOKEN_SECRET`.
- Nigdy nie trafia na frontend.

## C) Jak frontend wysyła klucz

Każde chronione żądanie wysyła:

- `Authorization: Bearer <token>`
- `x-device-id: <tlm_device_id>`
- `x-proof-ts: <unix_ms>`
- `x-proof: <base64url_signature>`

## D) Jak backend weryfikuje

Backend sprawdza:

1. format tokenu,
2. podpis HMAC (stałoczasowe porównanie),
3. `exp` (czy nie wygasło),
4. `x-device-id === payload.device_id`.
5. (PoP) weryfikacja podpisu `x-proof` kluczem publicznym `payload.device_pub`.

Jeśli którykolwiek punkt nie przejdzie → `401`.

## E) Endpointy (obecnie)

- Walidacja tokenu (stateless): `POST /api/license/validate-token`
  - headers: `Authorization`, `x-device-id`
- Dev issuer (tylko dev): `POST /api/license/dev-issue`
  - headers: `x-device-id`
  - body: `{ "plan": "pro" }`
- Przykładowy chroniony endpoint: `POST /api/analyze`
  - middleware: token required
- Parowanie urządzeń:
  - `POST /api/license/pair/start` (wymaga tokenu) → zwraca `code`
  - `POST /api/license/pair/finish` (bez tokenu) → rejestruje urządzenie i zwraca token dla nowego urządzenia

- Tpay status (front polling po powrocie z banku): `GET /api/payment/status/:transactionId`
  - header: `x-device-id`
  - jeśli status=`active` i device_id pasuje → odpowiedź zawiera też `token`

## H) Płatności bez DB (Tpay) — jak to spinamy

Bez bazy danych nie zapisujemy transakcji ani “licencji” po stronie serwera.
Zamiast tego checkout tworzy **podpisany kontekst płatności** (HMAC), który zawiera:

- `device_id`, `plan`, `email`, `iat`

Ten kontekst trafia do Tpay w polu `hiddenDescription`.

Następnie:

- webhook `POST /api/payment/tpay/webhook` (server→server) po potwierdzeniu płatności:
  - pobiera kontekst z webhook payload albo z `GET /transactions/{id}` w Tpay,
  - weryfikuje podpis kontekstu,
  - wystawia token dostępu i wysyła go mailem.

- frontend po powrocie z banku odpytuje:
  - `GET /api/payment/status/:transactionId` z nagłówkiem `x-device-id`,
  - backend pobiera status z Tpay i (jeśli płatność potwierdzona) zwraca `token`,
  - frontend może od razu zapisać token (aktywacja).

Ważne: `exp` w tokenie liczymy jako `iat + 30 dni`, żeby nie dało się “przedłużać” dostępu samym odpytywaniem statusu.

## F) Test (curl)

1) Wystaw token (dev):

```bash
curl -s -X POST http://localhost:3000/api/license/dev-issue \
  -H 'Content-Type: application/json' \
  -H 'x-device-id: test-device-123' \
  -d '{"plan":"pro"}'
```

2) Użyj tokenu na chronionym endpoint:

```bash
curl -s -X POST http://localhost:3000/api/analyze \
  -H 'Authorization: Bearer <TOKEN>' \
  -H 'x-device-id: test-device-123'
```

## G) Uwaga bezpieczeństwa (uczciwie)

Bez bazy danych **nie ma revokacji** (nie cofniemy klucza “w trakcie” — działa do `exp`).

Żeby ograniczyć dzielenie się kluczem, TL Meter używa **PoP (proof-of-possession)**:

- token zawiera `device_pub` (klucz publiczny urządzenia),
- urządzenie trzyma klucz prywatny w IndexedDB i podpisuje żądania (`x-proof`),
- backend weryfikuje podpis (bez tego odrzuca żądanie).

To znacząco utrudnia udostępnienie klucza komuś innemu (sam token nie wystarczy), ale nie jest ochroną absolutną:

- jeśli ktoś ma dostęp do Twojego urządzenia/profilu przeglądarki, może korzystać,
- malware/XSS na tym samym urządzeniu może wykonywać żądania w Twoim imieniu.
