# Instrukcje dla agentów — FOGO Smart Selector 1.0

## Zanim zaczniesz

1. Przeczytaj `README.md`, `docs/00_PROJECT_CONTEXT.md` i dokument dotyczący obszaru pracy.
2. Traktuj `docs/` jako trwałą pamięć produktu; aktualizuj ją razem z decyzją lub zmianą kodu.
3. Zmieniaj tylko pliki konieczne do zadania. Nie cofaj cudzych zmian ani nie formatuj masowo.

## Ochrona środowisk

- Aktualne demo to `selector-1-0-fogo-demo.smart-selector-demo.workers.dev`.
- Nie wdrażaj, nie zmieniaj Workerów, konfiguracji Cloudflare, sekretów, D1/R2 ani danych zdalnych bez wyraźnej zgody użytkownika.
- Pracuj w osobnym branchu i osobnym preview deploymentcie. Przed wdrożeniem potwierdź nazwę Workera, branch oraz środowisko — nie zakładaj, że historyczny `WDROZENIE-CLOUDFLARE.md` opisuje aktualne demo.
- Nie zapisuj kluczy, tokenów, danych klientów, prawdziwych cen ani rabatów w repozytorium.

## Reguły produktu

- AI może porządkować dane i wskazywać braki, ale nie zatwierdza doboru technicznego, ceny, rabatu, oferty ani decyzji bezpieczeństwa.
- Katalog, sizing, ceny i uprawnienia mają być deterministyczne, wersjonowane i audytowalne. Model językowy nie jest źródłem prawdy.
- Wynik z niepełnymi danymi pokazuje braki, założenia, pewność i wymaganą rolę zatwierdzającą.
- Zdjęcie/OCR wspiera identyfikację; kluczowe parametry wymagają potwierdzenia z zatwierdzonego źródła.

## Technika i weryfikacja

- UI znajduje się obecnie głównie w `app/page.tsx`; analiza zdjęcia w `app/api/analyze-device/route.ts`.
- Katalog produktów, dealerów i współczynniki zaszyte w obecnym UI są demonstracyjne.
- Po zmianie kodu uruchom `npm run lint`; przy zmianie zachowania lub buildu uruchom też odpowiedni test/build i zgłoś wynik.
