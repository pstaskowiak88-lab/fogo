# FOGO Smart Selector 1.0 — kontekst projektu

> Status: trwały kontekst roboczy. Dokument odróżnia istniejące demo od docelowego produktu. Nie jest katalogiem produkcyjnym, cennikiem ani automatyczną decyzją techniczną.

## Cel

FOGO Smart Selector ma skrócić drogę od nieuporządkowanej potrzeby zasilania do sprawdzalnej rekomendacji dla handlowca, partnera lub specjalisty. Użytkownik dodaje zdjęcia, wybiera odbiorniki lub wpisuje parametry; system porządkuje dane, wskazuje braki, uwzględnia rozruch i prowadzi do rekomendacji oraz kontaktu.

Zasada nadrzędna: **zatwierdzone dane i deterministyczne reguły wyznaczają wynik; AI pomaga zebrać i wyjaśnić dane, ale nie zastępuje specjalisty.**

## Aktualne demo

Źródłem aplikacji jest ten katalog (`fogo-konfigurator-demo/`). Działające demo:
`https://selector-1-0-fogo-demo.smart-selector-demo.workers.dev`

Przepływ ma pięć kroków: wybór zastosowania i metody wejścia; zdjęcia/lista/ręczne dane; weryfikacja; rekomendacja; wybór demonstracyjnego dystrybutora albo kontakt z FOGO. Zastosowania: dom, mała firma, warsztat, budowa i gospodarstwo rolne. Dla gospodarstwa demonstracja porównuje WOM oraz diesel.

| Obszar | Stan obecny |
| --- | --- |
| Frontend | Next/Vinext, główna logika w `app/page.tsx` |
| Zdjęcia | `POST /api/analyze-device`, Gemini z opcjonalnym wyszukiwaniem Google |
| Wynik AI | Typ, producent, model, moce, fazy, pewność, źródło, flaga potwierdzenia |
| Dobór | Frontendowa kalkulacja na statycznych przykładach |
| Dealerzy | Statyczna lista i symulowane odległości |
| Trwałe dane | Brak modelu biznesowego; `db/schema.ts` jest pusty |
| Testy | Test renderowanego HTML, bez testów sizingu i AI |

Obecny prototyp liczy sumę mocy ciągłej, największy dodatkowy pobór przy rozruchu i 15% zapasu. To zachowanie demonstracyjne, a nie zatwierdzony silnik sizingu FOGO.

## Docelowa mapa produktu

| Moduł | Rola | Stan |
| --- | --- | --- |
| Smart Selector | Intake, weryfikacja i rekomendacja | Demo istnieje |
| Field Sales | Stanowisko handlowca do pracy na leadzie i ofercie | Kierunek rozwoju |
| Dealer Portal | Portal partnera z ograniczonym zakresem danych | Kierunek rozwoju |
| Sales Cockpit | Kolejki, etapy, SLA, konwersja i eskalacje | Kierunek rozwoju |
| Smart Sales Agent | AI orkiestrujący dozwolone narzędzia | Kierunek rozwoju |

## Źródła prawdy

1. zatwierdzony katalog FOGO, kompatybilności i parametry techniczne;
2. wersjonowany rules engine oraz polityka wyjątków;
3. cennik, rabaty i matryca uprawnień;
4. dane użytkownika ze źródłem i datą;
5. OCR/AI jako sugestia do potwierdzenia;
6. odpowiedź modelu jako warstwa rozmowy, nigdy źródło prawdy.

Brak źródła oznacza pytanie, blokadę albo eskalację — nie domysł.
