# Architektura produktu

## Docelowy przepływ

```text
Klient / Field Sales / Dealer
             │
             ▼
   Smart Selector — karta wymagań
             │
     ┌───────┼────────┐
     ▼       ▼        ▼
  zdjęcia  katalog   rules engine
  i pliki  danych    i walidacja
     └───────┼────────┘
             ▼
 wynik + braki + założenia + audyt
             │
       ┌─────┼────────────┐
       ▼     ▼            ▼
 Field Sales Dealer Portal Sales Cockpit
             │
             ▼
      zatwierdzenie człowieka → oferta
```

Sprawa techniczno-handlowa jest wspólnym obiektem pracy, nie pojedynczą sesją czatu. Ma przechowywać dane wejściowe, źródła, wersję reguł, wynik, decyzje i historię przekazania.

## Stan obecny

- `app/page.tsx` łączy UI, dane przykładowe i kalkulację;
- `app/api/analyze-device/route.ts` waliduje obraz, stosuje prosty limit analiz na instancji i wywołuje Gemini;
- stan konfiguracji jest klientowy; nie ma trwałego leada, oferty ani audytu;
- katalog agregatów i lista dealerów są zaszyte w kodzie jako dane demo.

Historyczny dokument `WDROZENIE-CLOUDFLARE.md` mówi o Workerze `fogo-demo`; nie jest wystarczającą instrukcją dla aktualnego adresu demo bez potwierdzenia w Cloudflare.

## Moduły docelowe

**Smart Selector** zbiera wymagania, pliki i zdjęcia oraz pokazuje braki przed rekomendacją.

**Field Sales** pozwala przejąć lead, zobaczyć źródła danych, uzupełnić braki, uruchomić zatwierdzone reguły i przygotować sprawę do akceptacji.

**Dealer Portal** ogranicza widok do własnej organizacji, przypisanych spraw i dopuszczonych cen.

**Sales Cockpit** obsługuje kolejki, właścicieli, SLA, eskalacje i konwersję bez omijania zatwierdzeń.

**Smart Sales Agent** czyta dozwolony kontekst, wskazuje braki, uruchamia narzędzia po stronie serwera i prosi o potwierdzenie zmian.

## Docelowe obiekty danych

| Obiekt | Minimalna zawartość |
| --- | --- |
| Lead | źródło, kontakt, organizacja, właściciel, etap |
| Karta wymagań | pola, jednostki, źródło, kompletność i wersja |
| Wynik doboru | wejście, wersja katalogu/reguł, warianty, blokery, założenia |
| Oferta | zatwierdzony dobór, wersja cen, rabat, ważność, status |
| Załącznik | typ, dostęp, retencja, źródło i hash |
| Zdarzenie audytowe | kto, co, kiedy, przed/po i podstawa decyzji |

## Granice kodu przy rozbudowie

```text
app/selector/  app/field-sales/  app/dealer/  app/cockpit/
app/api/leads/ app/api/selections/ app/api/offers/ app/api/agents/
lib/domain/    lib/catalog/       lib/rules/      lib/pricing/
lib/audit/     lib/agents/
```

To jest mapa dla nowych funkcji, nie polecenie masowego refaktoryzowania działającego demo.
