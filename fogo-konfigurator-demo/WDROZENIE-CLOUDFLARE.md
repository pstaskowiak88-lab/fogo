# Pełny konfigurator FOGO w istniejącym Workerze `fogo-demo`

Ten projekt zastępuje małą stronę testową pełnym konfiguratorem. Analiza zdjęć
pozostaje w tej samej stronie i korzysta z sekretu `GEMINI_API_KEY`.

## Najprostsze wdrożenie przez GitHub

1. Wgraj całą zawartość tego folderu do prywatnego repozytorium GitHub.
2. W Cloudflare otwórz `Workers & Pages` → `fogo-demo` → `Settings` → `Builds`.
3. Kliknij `Connect` i wybierz utworzone repozytorium.
4. Ustaw:
   - Production branch: `main`
   - Build command: `npm run build`
   - Deploy command: `npx wrangler deploy --config dist/server/wrangler.json --name fogo-demo`
   - Root directory: pozostaw puste
5. Zapisz ustawienia i uruchom wdrożenie.
6. W `Settings` → `Variables and Secrets` sprawdź, czy istnieje sekret:
   - nazwa: `GEMINI_API_KEY`
   - typ: Secret
   - wartość: dotychczasowy, działający klucz Gemini

Po wdrożeniu ten sam adres `https://fogo-demo.pstaskowiak88.workers.dev`
otworzy pełny konfigurator. Dodane zdjęcie trafi do ścieżki
`/api/analyze-device`, Gemini rozpozna urządzenie i zwróci parametry bez
otwierania osobnej strony.

## Ważne

- Nie wklejaj całego projektu do okna `Edit code`. Pełny konfigurator składa się
  z wielu plików i grafik, dlatego musi być zbudowany jako projekt.
- Nie wpisuj klucza Gemini do żadnego pliku ani repozytorium.
- Dotychczasowy sekret przypisany do Workera `fogo-demo` powinien pozostać po
  aktualizacji kodu; przed testem warto potwierdzić jego obecność.
