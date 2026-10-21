# Reguły biznesowe

## Reguły nadrzędne

1. **Brak danych jest wynikiem.** Parametru krytycznego nie wolno uzupełniać domysłem; należy zadać pytanie albo eskalować.
2. **Dobór jest odtwarzalny.** Wynik wskazuje wersję katalogu, reguł, danych wejściowych i osobę zatwierdzającą.
3. **AI nie jest źródłem prawdy.** Odczyt ze zdjęcia lub internetu ma status i pewność; kluczowe pola wymagają potwierdzenia.
4. **Uprawnienia są częścią decyzji.** Dealer, handlowiec, technik i manager mają różne zakresy odczytu oraz zatwierdzania.
5. **Bezpieczeństwo ma pierwszeństwo przed konwersją.** Ryzyko lub konflikt blokuje automatyczny krok i wymaga eskalacji.

## Kompletność i dobór

Karta wymagań rozróżnia pola krytyczne, warunkowe i pomocnicze. Brak krytycznego pola blokuje dobór lub ofertę; pole warunkowe jest wymagane tylko dla danego zastosowania; pomocnicze obniża pewność, ale nie musi zatrzymywać pracy.

Produkcjny rules engine powinien kolejno: walidować jednostki, zakresy i spójność; identyfikować profil zastosowania; obliczać wymagania zatwierdzonymi regułami; filtrować zatwierdzony katalog; zwracać warianty z blokadami, założeniami i dowodami; wymagać akceptacji uprawnionej osoby.

Silnik musi docelowo obsłużyć między innymi moc ciągłą i rozruchową, fazy, cos φ, profil pracy, warunki środowiskowe, automatykę, hałas, sposób przyłączenia oraz ograniczenia produktu. Konkretne współczynniki, progi i zakresy mogą pochodzić wyłącznie z zatwierdzonej specyfikacji FOGO.

## Status sprawy

| Status | Znaczenie | Dozwolone działanie |
| --- | --- | --- |
| `draft` | Dane są zbierane | zapisz szkic, poproś o uzupełnienie |
| `blocked` | Braki krytyczne albo konflikt | bez doboru/oferty; pytanie lub eskalacja |
| `qualified` | Reguły zwróciły wariant | przedstaw do kontroli człowiekowi |
| `review_required` | Ryzyko albo wyjątek | tylko przekazanie do roli zatwierdzającej |
| `approved` | Wynik zatwierdzony | można stworzyć ofertę |
| `rejected` | Wynik odrzucony | zapisz powód i wróć do danych/reguł |

## Dealer, ceny i oferta

- Routing leada opiera się na zatwierdzonej polityce regionu, kanału, segmentu albo relacji dealer–FOGO; brak reguły trafia do kolejki ręcznej.
- Dealer widzi wyłącznie swoje sprawy oraz ceny dopuszczone dla jego organizacji.
- Cena pochodzi z wersjonowanego źródła; AI nie podaje wiążącej ceny.
- Rabat podlega roli i polityce. Przekroczenie progu wymaga akceptacji.
- Zmiana danych technicznych po zatwierdzeniu co najmniej unieważnia dobór; system musi wskazać, czy unieważnia także cenę i ofertę.

## Zdjęcia i dokumenty

- Wynik `analyze-device` jest propozycją z pewnością, notatką i źródłem.
- Gdy zwraca `needsConfirmation`, model lub parametr trzeba potwierdzić przed decyzją.
- Zdjęcie nie jest samodzielną podstawą do instrukcji bezpiecznej pracy ani wiążącego doboru.
- Przed produkcyjnym zapisem plików trzeba określić dostęp, retencję, zgodę, usuwanie i udostępnianie między klientem, dealerem oraz FOGO.

## Minimalny audyt

Rejestruj utworzenie i zmianę danych krytycznych, uruchomienie reguł, wersję katalogu/reguł, wynik AI, zatwierdzenie lub odrzucenie, zmianę właściciela oraz wydanie oferty. Logi nie mogą zawierać sekretów ani niepotrzebnej pełnej treści dokumentów.
