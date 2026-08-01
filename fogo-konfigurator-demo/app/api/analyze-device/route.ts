type AnalyzeRequest = {
  image?: string;
  application?: string;
};

type DeviceAnalysis = {
  deviceType: string;
  manufacturer: string;
  model: string;
  identificationConfidence: number;
  identificationNote: string;
  ratedPowerW: number;
  startupPowerW: number;
  startupFactor: number;
  voltageV: number;
  phases: 1 | 3;
  powerFactor: number;
  parameterConfidence: number;
  parameterNote: string;
  sourceTitle: string;
  sourceUrl: string;
  alternativeMatches: string[];
  needsConfirmation: boolean;
};

const MAX_IMAGE_DATA_URL_LENGTH = 12_000_000;
const ACCEPTED_IMAGE_PREFIXES = [
  "data:image/jpeg;base64,",
  "data:image/png;base64,",
  "data:image/webp;base64,",
] as const;

const rateLimits = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_REQUESTS = 12;

function isConfiguredApiKey(apiKey: string | undefined) {
  return Boolean(
    apiKey &&
      apiKey !== "UZUPELNIJ_KLUCZ_W_USTAWIENIACH" &&
      apiKey.length > 20,
  );
}

function isSupportedImage(image: string) {
  return ACCEPTED_IMAGE_PREFIXES.some((prefix) => image.startsWith(prefix));
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isDeviceAnalysis(value: unknown): value is DeviceAnalysis {
  if (!value || typeof value !== "object") return false;
  const result = value as Partial<DeviceAnalysis>;
  return (
    typeof result.deviceType === "string" &&
    typeof result.manufacturer === "string" &&
    typeof result.model === "string" &&
    typeof result.identificationConfidence === "number" &&
    typeof result.identificationNote === "string" &&
    typeof result.ratedPowerW === "number" &&
    typeof result.startupPowerW === "number" &&
    typeof result.startupFactor === "number" &&
    typeof result.voltageV === "number" &&
    (result.phases === 1 || result.phases === 3) &&
    typeof result.powerFactor === "number" &&
    typeof result.parameterConfidence === "number" &&
    typeof result.parameterNote === "string" &&
    typeof result.sourceTitle === "string" &&
    typeof result.sourceUrl === "string" &&
    (result.sourceUrl === "" || isHttpUrl(result.sourceUrl)) &&
    Array.isArray(result.alternativeMatches) &&
    result.alternativeMatches.every((item) => typeof item === "string") &&
    typeof result.needsConfirmation === "boolean"
  );
}

function isRateLimited(request: Request) {
  const ip = request.headers.get("cf-connecting-ip") ?? "local";
  const now = Date.now();
  const current = rateLimits.get(ip);

  if (!current || current.resetAt <= now) {
    rateLimits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  current.count += 1;
  return current.count > RATE_LIMIT_REQUESTS;
}

function extractDataUrl(image: string) {
  const match = image.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/s);
  return match ? { mimeType: match[1], base64: match[2] } : null;
}

function parseJson(text: string) {
  const cleaned = text
    .replace(/^\s*```json/i, "")
    .replace(/^\s*```/, "")
    .replace(/```\s*$/, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Missing JSON object");
  return JSON.parse(cleaned.slice(start, end + 1)) as unknown;
}

function callGemini(
  apiKey: string,
  base64: string,
  mimeType: string,
  prompt: string,
  useSearch: boolean,
) {
  const body: Record<string, unknown> = {
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType, data: base64 } },
        ],
      },
    ],
    generationConfig: { temperature: 0.1 },
  };

  if (useSearch) body.tools = [{ google_search: {} }];

  return fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(90_000),
    },
  );
}

export async function GET() {
  return Response.json(
    { configured: isConfiguredApiKey(process.env.GEMINI_API_KEY) },
    { headers: { "cache-control": "no-store" } },
  );
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!isConfiguredApiKey(apiKey)) {
    return Response.json(
      {
        error: "Moduł rozpoznawania czeka na aktywację przez administratora strony.",
        code: "SETUP_REQUIRED",
      },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }

  if (isRateLimited(request)) {
    return Response.json(
      {
        error: "Wykorzystano limit analiz dla tej sesji. Spróbuj ponownie później.",
        code: "RATE_LIMITED",
      },
      { status: 429, headers: { "cache-control": "no-store" } },
    );
  }

  let body: AnalyzeRequest;
  try {
    body = (await request.json()) as AnalyzeRequest;
  } catch {
    return Response.json({ error: "Nieprawidłowe dane zdjęcia." }, { status: 400 });
  }

  if (!body.image || !isSupportedImage(body.image)) {
    return Response.json(
      { error: "Obsługiwane są zdjęcia JPG, PNG i WebP." },
      { status: 400 },
    );
  }

  if (body.image.length > MAX_IMAGE_DATA_URL_LENGTH) {
    return Response.json(
      { error: "Zdjęcie jest zbyt duże. Maksymalny rozmiar pliku to 8 MB." },
      { status: 400 },
    );
  }

  const image = extractDataUrl(body.image);
  if (!image) {
    return Response.json({ error: "Nieprawidłowy format zdjęcia." }, { status: 400 });
  }

  const application =
    typeof body.application === "string"
      ? body.application.replace(/[^\p{L}\p{N} ._-]/gu, "").slice(0, 80)
      : "nie podano";

  const prompt = `Jesteś modułem technicznym konfiguratora FOGO. Przeanalizuj zdjęcie urządzenia na potrzeby doboru awaryjnego źródła zasilania. Kontekst zastosowania: ${application}.

Rozpoznaj typ urządzenia, producenta i możliwie dokładny model na podstawie całego zdjęcia, logo, panelu i widocznych napisów. Tabliczka znamionowa nie jest wymagana. Następnie wyszukaj w internecie, najlepiej w oficjalnej dokumentacji producenta, rzeczywisty pobór mocy, moc lub prąd rozruchowy, napięcie, liczbę faz i współczynnik mocy.

Nie myl mocy mechanicznej, pojemności baterii ani mocy wyjściowej z poborem mocy zasilania. Dla laptopa lub elektroniki użyj maksymalnej mocy zasilacza. Dla silnika uwzględnij rozruch. Jeśli brak danych o rozruchu, przyjmij bezpieczny współczynnik i zaznacz oszacowanie. Jeśli model jest niepewny, nie zgaduj: ustaw needsConfirmation=true, obniż pewność i podaj alternatywy. W sourceUrl podaj pełny adres rzeczywiście użytego źródła albo pusty tekst.

Zwróć WYŁĄCZNIE prawidłowy JSON po polsku, dokładnie w tym układzie:
{
  "deviceType": "",
  "manufacturer": "",
  "model": "",
  "identificationConfidence": 0,
  "identificationNote": "",
  "ratedPowerW": 1,
  "startupPowerW": 1,
  "startupFactor": 1,
  "voltageV": 230,
  "phases": 1,
  "powerFactor": 1,
  "parameterConfidence": 0,
  "parameterNote": "",
  "sourceTitle": "",
  "sourceUrl": "",
  "alternativeMatches": [],
  "needsConfirmation": true
}
Wartości liczbowe podawaj jako liczby bez jednostek. identificationConfidence i parameterConfidence mają zakres 0–100. phases może wynosić tylko 1 albo 3.`;

  let geminiResponse = await callGemini(
    apiKey!,
    image.base64,
    image.mimeType,
    prompt,
    true,
  );
  let searchUsed = true;

  if (!geminiResponse.ok && [400, 403].includes(geminiResponse.status)) {
    geminiResponse = await callGemini(
      apiKey!,
      image.base64,
      image.mimeType,
      prompt,
      false,
    );
    searchUsed = false;
  }

  const payload = (await geminiResponse.json()) as {
    error?: { message?: string };
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      groundingMetadata?: {
        groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
      };
    }>;
  };

  if (!geminiResponse.ok) {
    console.error("Gemini analysis failed", geminiResponse.status, payload.error?.message);
    return Response.json(
      {
        error:
          geminiResponse.status === 401 || geminiResponse.status === 403
            ? "Klucz Gemini wymaga sprawdzenia przez administratora."
            : geminiResponse.status === 429
              ? "Usługa osiągnęła chwilowy limit analiz. Spróbuj ponownie za moment."
              : "Nie udało się teraz rozpoznać urządzenia. Spróbuj ponownie.",
      },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }

  try {
    const candidate = payload.candidates?.[0];
    const text = candidate?.content?.parts?.map((part) => part.text ?? "").join("").trim();
    if (!text) throw new Error("Gemini returned no text");

    const result = parseJson(text) as DeviceAnalysis;
    const firstSource = candidate?.groundingMetadata?.groundingChunks?.find(
      (chunk) => chunk.web?.uri,
    )?.web;

    if ((!result.sourceUrl || !isHttpUrl(result.sourceUrl)) && firstSource?.uri) {
      result.sourceUrl = firstSource.uri;
      result.sourceTitle = firstSource.title || "Źródło internetowe";
    }

    if (!isDeviceAnalysis(result)) {
      throw new Error("Invalid device analysis shape");
    }

    return Response.json(
      { result, searchUsed },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    console.error("Invalid Gemini response", error);
    return Response.json(
      { error: "Wynik analizy wymaga ponownego sprawdzenia zdjęcia." },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }
}
