# Roadmap — bezpieczna rozbudowa Selector 1.0

## Zasada wdrażania

Każda faza powstaje poza działającym demo: w osobnym branchu i na preview deploymentcie. Przejście dalej wymaga zatwierdzonego źródła danych, przypadków testowych i akceptacji właściciela procesu. Dokumentacja lub prototyp nie są zgodą na zmianę Workera, sekretów czy produkcji.

## 0. Fundament danych i decyzji

- utrzymać ten pakiet kontekstu;
- wskazać właściciela katalogu, rules engine, cen, rabatów i retencji;
- dostarczyć minimalny wersjonowany katalog oraz reguły dla jednego use case;
- ustalić role, organizacje/dealerów i zdarzenia audytowe;
- potwierdzić, który Worker i branch obsługują produkcję, beta oraz preview.

**Brama:** zatwierdzony katalog, reguły i matryca uprawnień.

## 1. Field Sales Copilot — odczyt

- karta leada i karta wymagań;
- pola: potwierdzone, niepotwierdzone i brakujące;
- pytania uzupełniające oraz eskalacja;
- agent tylko do odczytu;
- testy braków, konfliktów i kontroli dostępu.

Nie obejmuje cen, rabatów, tworzenia oferty ani automatycznego zatwierdzenia.

## 2. Deterministyczny Smart Selector

- rules engine poza UI i modelem językowym;
- katalog oraz reguły z wersją obowiązywania;
- warianty, założenia, blokery i dowody;
- ręczne zatwierdzenie techniczne;
- audyt uruchomienia reguł.

**Brama:** zaakceptowane przypadki referencyjne, w tym graniczne i odmowy doboru.

## 3. Kontrolowana oferta

- zatwierdzone źródło cen;
- polityka rabatów i ścieżka akceptacji;
- szkic oferty tylko dla zatwierdzonego doboru;
- jawne potwierdzanie zapisu przez agenta;
- wersje ofert oraz decyzji.

## 4. Dealer Portal

- logowanie, organizacje i separacja danych;
- kolejka przypisanych leadów, ofert i statusów;
- uprawnienia cenowe oraz przekazanie do FOGO;
- testy izolacji danych jako warunek wdrożenia.

## 5. Sales Cockpit

- kolejki, SLA, właściciel, etap i eskalacja;
- kompletność danych, konwersja oraz przyczyny odrzuceń;
- obserwowalność AI i rules engine;
- ograniczenia kosztowe oraz retencja logów.

## Najbliższy krok

Wybrać use case Field Sales: **„Czy lead jest kompletny do przygotowania oferty?”**. Jest bezpieczny, bo zaczyna od odczytu i pytań, a jednocześnie buduje fundament danych potrzebny przez dobór, portal dealerów i Cockpit.
