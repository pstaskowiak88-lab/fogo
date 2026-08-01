"use client";

import {
  ChangeEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import QRCode from "qrcode";

type Appliance = {
  id: string;
  name: string;
  source: string;
  watts: number;
  startFactor: number;
  confidence: number;
  priority: "Krytyczny" | "Ważny" | "Opcjonalny";
  phase: "1F" | "3F";
  selected: boolean;
  identifiedModel?: string;
  identificationNote?: string;
  parameterSourceTitle?: string;
  parameterSourceUrl?: string;
  voltageV?: number;
};

type Generator = {
  model: string;
  power: number;
  regulation: string;
  engine: string;
  label: string;
  image: string;
  productUrl: string;
};

type PhotoItem = {
  id: string;
  name: string;
  url?: string;
  file?: File;
  kind: string;
  confidence?: number;
  applianceId?: string;
  recognitionStatus?: "queued" | "recognized" | "uncertain" | "error";
  backupRequired?: boolean;
  focus?: string;
  uploaded?: boolean;
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

type CaptureScope = "emergency" | "inventory";
type PurchaseMode = "distributor" | "fogo";
type FarmPowerSource = "pto" | "diesel";
type EntryMode = "photos" | "list" | "manual";
const SUPPORTED_UPLOAD_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const MAX_UPLOAD_SIZE = 8 * 1024 * 1024;
const FARM_APPLICATION = "Gospodarstwo Rolne" as const;
type ApplicationName =
  | "Dom"
  | "Mała firma"
  | "Warsztat"
  | "Budowa"
  | typeof FARM_APPLICATION;

type FarmGenerator = {
  model: string;
  kind: FarmPowerSource;
  maxKva: number;
  nominalKva: number;
  regulation: string;
  productUrl: string;
};

type Distributor = {
  id: string;
  name: string;
  city: string;
  postalCode: string;
  address: string;
  availability: string;
  service: boolean;
};

const INITIAL_APPLIANCES: Appliance[] = [
  {
    id: "fridge",
    name: "Lodówka z zamrażarką",
    source: "Rozpoznano urządzenie i sprężarkę",
    watts: 280,
    startFactor: 3,
    confidence: 96,
    priority: "Krytyczny",
    phase: "1F",
    selected: true,
  },
  {
    id: "heating",
    name: "Sterownik kotła + pompa CO",
    source: "Parametry potwierdzone w danych producenta",
    watts: 210,
    startFactor: 2.3,
    confidence: 98,
    priority: "Krytyczny",
    phase: "1F",
    selected: true,
  },
  {
    id: "well",
    name: "Pompa głębinowa",
    source: "Model i moc potwierdzone w danych producenta",
    watts: 1100,
    startFactor: 3.2,
    confidence: 91,
    priority: "Ważny",
    phase: "1F",
    selected: true,
  },
  {
    id: "gate",
    name: "Napęd bramy",
    source: "Model nieczytelny — wartość oszacowana",
    watts: 550,
    startFactor: 2.5,
    confidence: 72,
    priority: "Opcjonalny",
    phase: "1F",
    selected: true,
  },
  {
    id: "electronics",
    name: "Router + monitoring",
    source: "Rozpoznano 4 odbiorniki elektroniczne",
    watts: 120,
    startFactor: 1,
    confidence: 94,
    priority: "Ważny",
    phase: "1F",
    selected: true,
  },
];

const SMALL_BUSINESS_APPLIANCES: Appliance[] = [
  {
    id: "business-it",
    name: "Stanowiska komputerowe i sieć",
    source: "Zestaw elektroniki biurowej",
    watts: 1100,
    startFactor: 1.15,
    confidence: 94,
    priority: "Krytyczny",
    phase: "1F",
    selected: false,
  },
  {
    id: "business-fridge",
    name: "Chłodziarka zaplecza",
    source: "Sprężarka jednofazowa",
    watts: 420,
    startFactor: 3.2,
    confidence: 91,
    priority: "Ważny",
    phase: "1F",
    selected: false,
  },
  {
    id: "business-light",
    name: "Oświetlenie lokalu",
    source: "Obwody LED",
    watts: 850,
    startFactor: 1.1,
    confidence: 97,
    priority: "Krytyczny",
    phase: "1F",
    selected: false,
  },
  {
    id: "business-register",
    name: "Kasa, terminal i monitoring",
    source: "Odbiorniki elektroniczne",
    watts: 260,
    startFactor: 1,
    confidence: 96,
    priority: "Krytyczny",
    phase: "1F",
    selected: false,
  },
  {
    id: "business-ac",
    name: "Klimatyzacja",
    source: "Kompresor z rozruchem",
    watts: 2400,
    startFactor: 2.4,
    confidence: 84,
    priority: "Opcjonalny",
    phase: "1F",
    selected: false,
  },
  {
    id: "business-door",
    name: "Drzwi lub brama automatyczna",
    source: "Silnik jednofazowy",
    watts: 650,
    startFactor: 2.6,
    confidence: 87,
    priority: "Ważny",
    phase: "1F",
    selected: false,
  },
];

const WORKSHOP_APPLIANCES: Appliance[] = [
  {
    id: "compressor",
    name: "Kompresor",
    source: "Silnik trójfazowy 4 kW",
    watts: 4000,
    startFactor: 3,
    confidence: 92,
    priority: "Krytyczny",
    phase: "3F",
    selected: false,
  },
  {
    id: "welder",
    name: "Spawarka inwertorowa",
    source: "Odbiornik elektroniczny dużej mocy",
    watts: 3600,
    startFactor: 1.25,
    confidence: 90,
    priority: "Ważny",
    phase: "3F",
    selected: false,
  },
  {
    id: "lift",
    name: "Podnośnik",
    source: "Silnik hydrauliczny 3 kW",
    watts: 3000,
    startFactor: 2.8,
    confidence: 89,
    priority: "Krytyczny",
    phase: "3F",
    selected: false,
  },
  {
    id: "workshop-tools",
    name: "Elektronarzędzia ręczne",
    source: "Grupa odbiorników jednofazowych",
    watts: 1800,
    startFactor: 1.8,
    confidence: 93,
    priority: "Ważny",
    phase: "1F",
    selected: false,
  },
  {
    id: "workshop-light",
    name: "Oświetlenie i sterowanie",
    source: "Obwody LED i automatyka",
    watts: 700,
    startFactor: 1.1,
    confidence: 97,
    priority: "Krytyczny",
    phase: "1F",
    selected: false,
  },
  {
    id: "workshop-vent",
    name: "Odciąg lub wentylacja",
    source: "Silnik wentylatora",
    watts: 1500,
    startFactor: 2.4,
    confidence: 86,
    priority: "Opcjonalny",
    phase: "3F",
    selected: false,
  },
];

const CONSTRUCTION_APPLIANCES: Appliance[] = [
  {
    id: "site-mixer",
    name: "Betoniarka",
    source: "Silnik jednofazowy",
    watts: 1500,
    startFactor: 2.8,
    confidence: 93,
    priority: "Krytyczny",
    phase: "1F",
    selected: false,
  },
  {
    id: "site-saw",
    name: "Pilarka stołowa",
    source: "Silnik z ciężkim rozruchem",
    watts: 2600,
    startFactor: 3,
    confidence: 91,
    priority: "Ważny",
    phase: "3F",
    selected: false,
  },
  {
    id: "site-tools",
    name: "Elektronarzędzia",
    source: "Młot, szlifierka i wiertarka",
    watts: 2200,
    startFactor: 1.9,
    confidence: 94,
    priority: "Krytyczny",
    phase: "1F",
    selected: false,
  },
  {
    id: "site-pump",
    name: "Pompa odwodnieniowa",
    source: "Silnik pompy",
    watts: 1800,
    startFactor: 3,
    confidence: 88,
    priority: "Ważny",
    phase: "1F",
    selected: false,
  },
  {
    id: "site-light",
    name: "Oświetlenie placu",
    source: "Naświetlacze LED",
    watts: 900,
    startFactor: 1.1,
    confidence: 97,
    priority: "Krytyczny",
    phase: "1F",
    selected: false,
  },
  {
    id: "site-container",
    name: "Kontener i ogrzewanie",
    source: "Zaplecze budowy",
    watts: 2000,
    startFactor: 1,
    confidence: 95,
    priority: "Opcjonalny",
    phase: "1F",
    selected: false,
  },
];

const FARM_APPLIANCES: Appliance[] = [
  {
    id: "milking",
    name: "Dojarka i pompa próżniowa",
    source: "Rozpoznano układ trójfazowy: 7,5 kW",
    watts: 7500,
    startFactor: 2.8,
    confidence: 94,
    priority: "Krytyczny",
    phase: "3F",
    selected: false,
  },
  {
    id: "milk-cooling",
    name: "Schładzalnik mleka",
    source: "Model rozpoznany z obudowy i panelu",
    watts: 4000,
    startFactor: 3,
    confidence: 91,
    priority: "Krytyczny",
    phase: "3F",
    selected: false,
  },
  {
    id: "farm-ventilation",
    name: "Wentylacja budynku inwentarskiego",
    source: "Rozpoznano 4 wentylatory po 750 W",
    watts: 3000,
    startFactor: 2,
    confidence: 96,
    priority: "Ważny",
    phase: "3F",
    selected: false,
  },
  {
    id: "farm-water",
    name: "Pompa wody",
    source: "Niejednoznaczny model: wartość do potwierdzenia",
    watts: 3000,
    startFactor: 3,
    confidence: 76,
    priority: "Ważny",
    phase: "3F",
    selected: false,
  },
  {
    id: "feed-line",
    name: "Paszociąg i podajniki",
    source: "Rozpoznano dwa silniki w jednej linii",
    watts: 5500,
    startFactor: 3,
    confidence: 89,
    priority: "Ważny",
    phase: "3F",
    selected: false,
  },
  {
    id: "farm-controls",
    name: "Oświetlenie, sterowanie i monitoring",
    source: "Zestaw odbiorników jednofazowych",
    watts: 1200,
    startFactor: 1.1,
    confidence: 97,
    priority: "Ważny",
    phase: "1F",
    selected: false,
  },
];

const APPLICATIONS: ApplicationName[] = [
  "Dom",
  "Mała firma",
  "Warsztat",
  "Budowa",
  FARM_APPLICATION,
];

const APPLICATION_APPLIANCES: Record<ApplicationName, Appliance[]> = {
  Dom: INITIAL_APPLIANCES,
  "Mała firma": SMALL_BUSINESS_APPLIANCES,
  Warsztat: WORKSHOP_APPLIANCES,
  Budowa: CONSTRUCTION_APPLIANCES,
  [FARM_APPLICATION]: FARM_APPLIANCES,
};

const APPLICATION_DETAILS: Record<
  Exclude<ApplicationName, typeof FARM_APPLICATION>,
  { title: string; description: string; short: string }
> = {
  Dom: {
    title: "Co ma działać w domu podczas awarii?",
    description:
      "Wybierz odbiorniki na planie awaryjnym. Moc i rekomendowany model zmienią się natychmiast.",
    short: "Dom i instalacje",
  },
  "Mała firma": {
    title: "Które procesy firmy muszą pozostać aktywne?",
    description:
      "Zaznacz urządzenia krytyczne dla sprzedaży, bezpieczeństwa i ciągłości pracy.",
    short: "Lokal i zaplecze",
  },
  Warsztat: {
    title: "Które maszyny mają pracować równocześnie?",
    description:
      "Zestaw uwzględnia silniki 3F i cięższy rozruch. Kolejność uruchamiania wpływa na wynik.",
    short: "Maszyny i narzędzia",
  },
  Budowa: {
    title: "Jakie odbiorniki zabierasz na plac budowy?",
    description:
      "Dodawaj sprzęt do bieżącego etapu robót, zamiast dobierać moc do całej budowy naraz.",
    short: "Plac i zaplecze",
  },
};

const DEVICE_SYMBOLS: Record<string, string> = {
  fridge: "❄",
  heating: "♨",
  well: "↟",
  gate: "↔",
  electronics: "●",
  "business-it": "▣",
  "business-fridge": "❄",
  "business-light": "✦",
  "business-register": "▤",
  "business-ac": "≈",
  "business-door": "↔",
  compressor: "◉",
  welder: "ϟ",
  lift: "↥",
  "workshop-tools": "⌁",
  "workshop-light": "✦",
  "workshop-vent": "◎",
  "site-mixer": "◌",
  "site-saw": "△",
  "site-tools": "⌁",
  "site-pump": "≈",
  "site-light": "✦",
  "site-container": "□",
};

function appliancesFor(application: ApplicationName, selectAll = false) {
  return APPLICATION_APPLIANCES[application].map((item) => ({
    ...item,
    selected: selectAll,
  }));
}

const GENERATORS: Generator[] = [
  {
    model: "F 4001 iS",
    power: 3.3,
    regulation: "Inwerter IVR",
    engine: "Rato",
    label: "wariant minimalny",
    image: "/fogo-f4001is.jpg",
    productUrl: "https://www.fogo.pl/f-4001-is",
  },
  {
    model: "F 5001 iSG",
    power: 4,
    regulation: "Inwerter IVR",
    engine: "Rato / benzyna i LPG",
    label: "wariant optymalny",
    image: "/fogo-f5001isg.jpg",
    productUrl: "https://www.fogo.pl/f-5001-isg",
  },
  {
    model: "FH 7001 TR",
    power: 6.2,
    regulation: "DVR",
    engine: "Honda",
    label: "większy zapas",
    image: "/fogo-fh7001tr.jpg",
    productUrl: "https://www.fogo.pl/fh-7001-tr",
  },
  {
    model: "F 8001 iSA",
    power: 7.5,
    regulation: "Inwerter IVR",
    engine: "Rato",
    label: "większy zapas",
    image: "/fogo-f8001isa.jpg",
    productUrl: "https://www.fogo.pl/f-8001-isa",
  },
  {
    model: "FV 10001 TRE",
    power: 9.5,
    regulation: "AVR",
    engine: "Vanguard",
    label: "większy zapas",
    image: "/fogo-fv10001tre.jpg",
    productUrl: "https://www.fogo.pl/fv-10001-tre",
  },
];

const SAMPLE_PHOTOS: PhotoItem[] = [
  { id: "p1", name: "lodowka.jpg", kind: "Lodówka" },
  { id: "p2", name: "piec-panel.jpg", kind: "Kocioł + pompa" },
  { id: "p3", name: "pompa-glebinowa.jpg", kind: "Pompa 1,1 kW" },
  { id: "p4", name: "naped-bramy.jpg", kind: "Napęd bramy" },
  { id: "p5", name: "router-kamery.jpg", kind: "Elektronika" },
];

const FARM_SAMPLE_PHOTOS: PhotoItem[] = [
  {
    id: "f1",
    name: "dojarka.jpg",
    kind: "Dojarka",
    url: "/farm-dairy.webp",
    focus: "25% center",
  },
  {
    id: "f2",
    name: "schladzalnik.jpg",
    kind: "Schładzalnik mleka",
    url: "/farm-dairy.webp",
    focus: "78% center",
  },
  {
    id: "f3",
    name: "wentylacja-obory.jpg",
    kind: "Wentylacja",
    url: "/farm-feed.webp",
    focus: "50% 18%",
  },
  {
    id: "f4",
    name: "pompa-wody.jpg",
    kind: "Pompa 3 kW",
    url: "/farm-feed.webp",
    focus: "18% 68%",
  },
  {
    id: "f5",
    name: "paszociag.jpg",
    kind: "Paszociąg",
    url: "/farm-feed.webp",
    focus: "82% 60%",
  },
  {
    id: "f6",
    name: "sterowanie.jpg",
    kind: "Sterowanie",
    url: "/farm-feed.webp",
    focus: "55% 68%",
  },
];

type FarmZone = "dairy" | "barn" | "power";

const FARM_ZONES: {
  id: FarmZone;
  label: string;
  description: string;
  image: string;
  devices: {
    applianceId: string;
    number: string;
    x: number;
    y: number;
  }[];
}[] = [
  {
    id: "dairy",
    label: "Udojnia i chłodzenie",
    description: "Największe odbiorniki pracujące przy każdym udoju.",
    image: "/farm-dairy.webp",
    devices: [
      { applianceId: "milking", number: "01", x: 23, y: 56 },
      { applianceId: "milk-cooling", number: "02", x: 76, y: 50 },
    ],
  },
  {
    id: "barn",
    label: "Obora i pasze",
    description: "Wentylacja, woda, karmienie i automatyka budynku.",
    image: "/farm-feed.webp",
    devices: [
      { applianceId: "farm-ventilation", number: "03", x: 51, y: 22 },
      { applianceId: "farm-water", number: "04", x: 18, y: 69 },
      { applianceId: "feed-line", number: "05", x: 79, y: 62 },
      { applianceId: "farm-controls", number: "06", x: 51, y: 69 },
    ],
  },
  {
    id: "power",
    label: "Zasilanie awaryjne",
    description: "Porównanie napędu WOM i niezależnego diesla po bilansie.",
    image: "/farm-power.webp",
    devices: [],
  },
];

const PTO_GENERATORS: FarmGenerator[] = [
  {
    model: "AV 18 R",
    kind: "pto",
    maxKva: 19.8,
    nominalKva: 18,
    regulation: "DVR",
    productUrl: "https://www.fogo.pl/av-18-r",
  },
  {
    model: "AV 22 R",
    kind: "pto",
    maxKva: 24.4,
    nominalKva: 22,
    regulation: "DVR",
    productUrl: "https://www.fogo.pl/av-22-r",
  },
  {
    model: "AV 27 R",
    kind: "pto",
    maxKva: 29.7,
    nominalKva: 27,
    regulation: "DVR",
    productUrl: "https://www.fogo.pl/av-27-r",
  },
  {
    model: "AV 38 R",
    kind: "pto",
    maxKva: 41.8,
    nominalKva: 38,
    regulation: "DVR",
    productUrl: "https://www.fogo.pl/av-38-r",
  },
  {
    model: "AV 60 R",
    kind: "pto",
    maxKva: 66,
    nominalKva: 60,
    regulation: "AVR",
    productUrl: "https://www.fogo.pl/av-60-r",
  },
];

const DIESEL_GENERATORS: FarmGenerator[] = [
  {
    model: "FD 20 F-Q",
    kind: "diesel",
    maxKva: 22,
    nominalKva: 20,
    regulation: "AVR",
    productUrl: "https://www.fogo.pl/diesel-22-66kva",
  },
  {
    model: "FD 30 F-Q",
    kind: "diesel",
    maxKva: 33,
    nominalKva: 30,
    regulation: "AVR",
    productUrl: "https://www.fogo.pl/diesel-22-66kva",
  },
  {
    model: "FD 40 F-Q",
    kind: "diesel",
    maxKva: 44,
    nominalKva: 40,
    regulation: "AVR",
    productUrl: "https://www.fogo.pl/diesel-22-66kva",
  },
  {
    model: "FD 60 F-Q",
    kind: "diesel",
    maxKva: 66,
    nominalKva: 60,
    regulation: "AVR",
    productUrl: "https://www.fogo.pl/diesel-22-66kva",
  },
];

const DISTRIBUTORS: Distributor[] = [
  {
    id: "leszno",
    name: "Partner FOGO Leszno",
    city: "Leszno",
    postalCode: "64-100",
    address: "ul. Przemysłowa 18",
    availability: "Dostępny w 1–2 dni",
    service: true,
  },
  {
    id: "rawicz",
    name: "Partner FOGO Rawicz",
    city: "Rawicz",
    postalCode: "63-900",
    address: "ul. Sarnowska 12",
    availability: "Dostępny na zamówienie",
    service: true,
  },
  {
    id: "wroclaw",
    name: "Partner FOGO Wrocław",
    city: "Wrocław",
    postalCode: "51-501",
    address: "ul. Kowalska 7",
    availability: "Dostępny w 2–4 dni",
    service: false,
  },
];

const SESSION_CODE = "FG-4827";

async function fileToDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const maxDimension = 2048;
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");

  if (!context) {
    bitmap.close();
    throw new Error("Nie udało się przygotować zdjęcia do analizy.");
  }

  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.9);
}

async function analyzeDevicePhoto(
  file: File,
  application: ApplicationName,
): Promise<DeviceAnalysis> {
  const image = await fileToDataUrl(file);
  const response = await fetch("/api/analyze-device", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ image, application }),
  });
  const payload = (await response.json()) as {
    result?: DeviceAnalysis;
    error?: string;
  };

  if (!response.ok || !payload.result) {
    throw new Error(
      payload.error || "Nie udało się rozpoznać urządzenia i znaleźć parametrów.",
    );
  }
  return payload.result;
}

function formatPower(watts: number) {
  return watts >= 1000
    ? `${(watts / 1000).toFixed(2).replace(".", ",")} kW`
    : `${Math.round(watts)} W`;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function PhotoTile({ photo }: { photo: PhotoItem }) {
  return (
    <div className="photo-tile">
      {photo.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo.url}
          alt=""
          style={{ objectPosition: photo.focus ?? "center" }}
        />
      ) : (
        <div className="sample-photo" aria-hidden="true">
          <span className="sample-device" />
          <span className="sample-label" />
        </div>
      )}
      <span
        className={`photo-ok ${photo.recognitionStatus ?? ""}`}
        aria-label={
          photo.recognitionStatus === "recognized"
            ? "Rozpoznano"
            : photo.recognitionStatus === "uncertain"
              ? "Wynik niepewny"
              : "Gotowe do analizy"
        }
      >
        {photo.recognitionStatus === "uncertain" ? "?" : "✓"}
      </span>
      <div>
        <strong>{photo.kind}</strong>
        <small>
          {photo.confidence !== undefined
            ? `${photo.confidence}% pewności • ${photo.name}`
            : photo.name}
        </small>
      </div>
    </div>
  );
}

function MobileCapture({
  code,
  initialScope,
  farmMode,
  onExit,
}: {
  code: string;
  initialScope: CaptureScope;
  farmMode: boolean;
  onExit: () => void;
}) {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [sent, setSent] = useState(false);
  const [scope, setScope] = useState<CaptureScope | null>(initialScope);

  function addMobilePhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    setPhotos((current) => [
      ...current,
      ...files.map((file, index) => ({
        id: `${file.name}-${file.lastModified}-${current.length + index}`,
        name: file.name,
        kind: "Zdjęcie odbiornika",
        url: URL.createObjectURL(file),
        backupRequired: true,
      })),
    ]);
    setSent(false);
    event.target.value = "";
  }

  function toggleBackupRequired(id: string) {
    setPhotos((current) =>
      current.map((photo) =>
        photo.id === id
          ? { ...photo, backupRequired: !photo.backupRequired }
          : photo,
      ),
    );
  }

  return (
    <main className="mobile-capture">
      <header className="mobile-head">
        <span className="brand-main">FOGO</span>
        <span className="secure-chip">● SESJA {code}</span>
      </header>

      <section className="mobile-card">
        {scope === null ? (
          <>
            <span className="mobile-step">KROK 1 Z 3</span>
            <h1>
              Co fotografujemy podczas obchodu
              {farmMode ? " gospodarstwa?" : "?"}
            </h1>
            <p>
              Zakres możesz zmienić później. Wpłynie on na listę odbiorników
              uwzględnionych przy doborze agregatu.
            </p>

            <div className="mobile-scope-options">
              <button onClick={() => setScope("emergency")}>
                <span className="scope-radio">✓</span>
                <span>
                  <strong>Tylko urządzenia awaryjne</strong>
                  <small>
                    Fotografuj wyłącznie to, co musi działać podczas zaniku
                    zasilania.
                  </small>
                </span>
                <b>NAJSZYBCIEJ</b>
              </button>
              <button onClick={() => setScope("inventory")}>
                <span className="scope-radio">◎</span>
                <span>
                  <strong>Wszystkie odbiorniki</strong>
                  <small>
                    Zrób pełny obchód, a później oznacz urządzenia potrzebne
                    awaryjnie.
                  </small>
                </span>
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mobile-mode-line">
              <span className="mobile-step">KROK 2 Z 3 • TRYB OBCHODU</span>
              <button
                onClick={() => {
                  setScope(null);
                  setSent(false);
                }}
              >
                Zmień zakres
              </button>
            </div>
            <h1>
              Fotografuj kolejne odbiorniki
              {farmMode ? " w gospodarstwie" : ""}
            </h1>
            <p>
              {scope === "emergency"
                ? "Dodawaj tylko urządzenia, które mają działać podczas awarii. Każde zdjęcie automatycznie trafi do bilansu."
                : "Fotografuj wszystkie urządzenia. Przy każdym możesz wskazać, czy ma być objęte zasilaniem awaryjnym."}
            </p>

            <div className={`walk-mode-badge ${scope}`}>
              <span>{scope === "emergency" ? "⚡" : "⌂"}</span>
              <div>
                <strong>
                  {scope === "emergency"
                    ? "Tylko zasilanie awaryjne"
                    : "Pełny obchód odbiorników"}
                </strong>
                <small>
                  {scope === "emergency"
                    ? "Wszystkie dodane urządzenia zostaną uwzględnione"
                    : "Do obliczeń trafią tylko pozycje oznaczone jako awaryjne"}
                </small>
              </div>
            </div>

            <div className="capture-tip">
              <span>1</span>
              <p>
                Zrób zwykłe zdjęcie całego urządzenia. Fogo spróbuje rozpoznać
                model i znaleźć jego parametry w sieci. Tylko gdy wynik będzie
                niepewny, poprosi o zbliżenie logo lub panelu.
              </p>
            </div>

            <label className="camera-button">
              <span className="camera-icon">◎</span>
              <span>
                <strong>
                  {photos.length === 0
                    ? "Sfotografuj pierwszy odbiornik"
                    : "Dodaj kolejny odbiornik"}
                </strong>
                <small>Możesz zrobić kilka ujęć tego samego urządzenia</small>
              </span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={addMobilePhotos}
              />
            </label>

            {photos.length > 0 && (
              <div className="mobile-tour-list">
                <div className="mobile-tour-head">
                  <strong>Obchód w toku</strong>
                  <span>{photos.length} zdjęć</span>
                </div>
                {photos.map((photo, index) => (
                  <div className="mobile-tour-row" key={photo.id}>
                    {photo.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo.url} alt="" />
                    ) : (
                      <span className="tour-placeholder">◎</span>
                    )}
                    <div>
                      <strong>Odbiornik {index + 1}</strong>
                      <small>{photo.name}</small>
                    </div>
                    {scope === "inventory" ? (
                      <button
                        className={
                          photo.backupRequired === false ? "" : "selected"
                        }
                        onClick={() => toggleBackupRequired(photo.id)}
                      >
                        {photo.backupRequired === false
                          ? "Poza awaryjnym"
                          : "✓ Ma działać"}
                      </button>
                    ) : (
                      <span className="emergency-mark">✓ Awaryjne</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!sent ? (
              <button
                className="primary-button wide"
                disabled={photos.length === 0}
                onClick={() => setSent(true)}
              >
                Zakończ obchód i wyślij <span>→</span>
              </button>
            ) : (
              <div className="mobile-success">
                <span>✓</span>
                <div>
                  <strong>Obchód zakończony</strong>
                  <p>
                    {scope === "inventory"
                      ? `${photos.filter((photo) => photo.backupRequired !== false).length} z ${photos.length} pozycji trafi do bilansu zasilania awaryjnego.`
                      : `${photos.length} pozycji trafi do bilansu zasilania awaryjnego.`}{" "}
                    W pełnym wdrożeniu komputer automatycznie rozpocznie analizę.
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        <button className="mobile-exit" onClick={onExit}>
          Wróć do pełnego demo
        </button>
      </section>

      <p className="mobile-foot">
        Zdjęcia w wersji produkcyjnej będą szyfrowane i automatycznie usuwane po
        przygotowaniu doboru.
      </p>
    </main>
  );
}

export default function Home() {
  const [step, setStep] = useState(1);
  const [application, setApplication] = useState<ApplicationName>("Dom");
  const [mobileFarmMode, setMobileFarmMode] = useState(false);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [appliances, setAppliances] =
    useState<Appliance[]>(() => appliancesFor("Dom"));
  const [showPhone, setShowPhone] = useState(false);
  const [phoneConnected, setPhoneConnected] = useState(false);
  const [analysisState, setAnalysisState] = useState<
    "idle" | "loading-model" | "analyzing" | "ready" | "error"
  >("idle");
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisError, setAnalysisError] = useState("");
  const [qrData, setQrData] = useState("");
  const [captureMode, setCaptureMode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loadStrategy, setLoadStrategy] = useState<"all" | "priority">(
    "priority",
  );
  const [showReport, setShowReport] = useState(false);
  const [captureScope, setCaptureScope] =
    useState<CaptureScope>("emergency");
  const [locationQuery, setLocationQuery] = useState("");
  const [locationSearched, setLocationSearched] = useState(false);
  const [selectedDistributor, setSelectedDistributor] = useState("leszno");
  const [purchaseMode, setPurchaseMode] =
    useState<PurchaseMode>("distributor");
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const [farmPowerSource, setFarmPowerSource] =
    useState<FarmPowerSource | null>(null);
  const [tractorAvailable, setTractorAvailable] = useState(true);
  const [farmZone, setFarmZone] = useState<FarmZone>("dairy");
  const [entryMode, setEntryMode] = useState<EntryMode>("photos");
  const [showDevicePicker, setShowDevicePicker] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      setCaptureMode(params.get("capture"));
      if (params.get("scope") === "inventory") {
        setCaptureScope("inventory");
      }
      setMobileFarmMode(params.get("application") === "farm");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!showPhone) return;
    const captureUrl = `${window.location.origin}${window.location.pathname}?capture=${SESSION_CODE}&scope=${captureScope}&application=${application === FARM_APPLICATION ? "farm" : "general"}`;
    QRCode.toDataURL(captureUrl, {
      width: 240,
      margin: 1,
      color: { dark: "#192025", light: "#ffffff" },
    }).then(setQrData);
  }, [showPhone, captureScope, application]);

  const calculation = useMemo(() => {
    const chosen = appliances.filter((item) => item.selected);
    const critical = chosen.filter((item) => item.priority === "Krytyczny");
    const continuousAll = chosen.reduce((sum, item) => sum + item.watts, 0);
    const continuousCritical = critical.reduce(
      (sum, item) => sum + item.watts,
      0,
    );
    const continuous =
      loadStrategy === "all"
        ? continuousAll
        : continuousCritical +
          chosen
            .filter((item) => item.priority === "Ważny")
            .reduce((sum, item) => sum + item.watts, 0) *
            0.65;
    const largestStart = chosen.reduce(
      (largest, item) =>
        Math.max(largest, item.watts * (item.startFactor - 1)),
      0,
    );
    const startup = continuous + largestStart;
    const target = chosen.length === 0 ? 0 : Math.max(1800, startup * 1.15);
    const recommended =
      GENERATORS.find((generator) => generator.power * 1000 >= target) ??
      GENERATORS[GENERATORS.length - 1];
    const recommendedIndex = GENERATORS.indexOf(recommended);
    const minimum =
      GENERATORS.find(
        (generator) => generator.power * 1000 >= Math.max(1800, startup),
      ) ?? recommended;
    const reserve =
      GENERATORS[
        Math.min(recommendedIndex + 1, GENERATORS.length - 1)
      ] ?? recommended;

    return {
      continuous,
      continuousAll,
      startup,
      target,
      exceedsPortable:
        target > GENERATORS[GENERATORS.length - 1].power * 1000,
      recommended,
      minimum,
      reserve,
      chosen,
    };
  }, [appliances, loadStrategy]);

  const farmCalculation = useMemo(() => {
    const requiredKva = calculation.target / 1000 / 0.8;
    const pto =
      PTO_GENERATORS.find(
        (generator) => generator.nominalKva >= requiredKva,
      ) ??
      PTO_GENERATORS[PTO_GENERATORS.length - 1];
    const diesel =
      DIESEL_GENERATORS.find(
        (generator) => generator.nominalKva >= requiredKva,
      ) ??
      DIESEL_GENERATORS[DIESEL_GENERATORS.length - 1];
    return {
      requiredKva,
      pto,
      diesel,
      exceedsRange: requiredKva > 60,
    };
  }, [calculation.target]);

  function addPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    const supportedFiles = files.filter(
      (file) =>
        SUPPORTED_UPLOAD_TYPES.has(file.type) && file.size <= MAX_UPLOAD_SIZE,
    );

    if (supportedFiles.length !== files.length) {
      setAnalysisError(
        "Część plików pominięto. Dodaj zdjęcie JPG, PNG lub WebP o rozmiarze do 8 MB.",
      );
      setAnalysisState("error");
    } else {
      setAnalysisError("");
      setAnalysisState("idle");
    }

    const newPhotos = supportedFiles.map((file, index) => ({
      id: `${file.name}-${file.lastModified}-${index}`,
      name: file.name,
      kind: "Do rozpoznania",
      url: URL.createObjectURL(file),
      file,
      uploaded: true,
      recognitionStatus: "queued" as const,
    }));
    setPhotos((current) => [...current, ...newPhotos].slice(0, 8));
    event.target.value = "";
  }

  function loadSample(source: "sample" | "phone" = "sample") {
    setPhotos(
      application === FARM_APPLICATION ? FARM_SAMPLE_PHOTOS : SAMPLE_PHOTOS,
    );
    if (!appliances.some((item) => item.selected)) {
      setAppliances(appliancesFor(application, true));
    }
    setAnalysisState("idle");
    if (source === "phone") {
      setPhoneConnected(true);
      setShowPhone(false);
    }
  }

  async function analyze() {
    if (photos.length === 0) return;
    const uploadedPhotos = photos.filter((photo) => photo.uploaded && photo.file);
    if (uploadedPhotos.length === 0) {
      setAnalysisState("analyzing");
      window.setTimeout(() => {
        setAnalysisState("ready");
        setStep(3);
      }, 1100);
      return;
    }

    setAnalysisError("");
    setAnalysisProgress(0);
    setAnalysisState("loading-model");

    try {
      setAnalysisState("analyzing");
      const recognized: PhotoItem[] = [];
      const recognizedAppliances: Appliance[] = [];
      let analyzedCount = 0;

      for (let index = 0; index < photos.length; index += 1) {
        const photo = photos[index];
        if (!photo.uploaded || !photo.file) {
          recognized.push(photo);
          continue;
        }

        const result = await analyzeDevicePhoto(photo.file, application);
        const confidence = Math.min(
          result.identificationConfidence,
          result.parameterConfidence,
        );
        const applianceId = `photo-${index}-${photo.id}`;
        const identifiedModel = [result.manufacturer, result.model]
          .filter(Boolean)
          .join(" ")
          .trim();
        const ratedPower = Math.max(1, Math.round(result.ratedPowerW));
        const startupFactor = clamp(
          Math.max(
            result.startupFactor,
            result.startupPowerW / ratedPower,
          ),
          1,
          12,
        );

        recognized.push({
          ...photo,
          kind: identifiedModel || result.deviceType,
          confidence,
          applianceId,
          recognitionStatus:
            result.needsConfirmation || confidence < 75
              ? "uncertain"
              : "recognized",
        });
        recognizedAppliances.push({
          id: applianceId,
          name: identifiedModel || result.deviceType,
          source: result.parameterNote,
          watts: ratedPower,
          startFactor: startupFactor,
          confidence,
          priority: captureScope === "emergency" ? "Krytyczny" : "Ważny",
          phase: result.phases === 3 ? "3F" : "1F",
          selected: true,
          identifiedModel,
          identificationNote: result.identificationNote,
          parameterSourceTitle: result.sourceTitle,
          parameterSourceUrl: result.sourceUrl,
          voltageV: result.voltageV,
        });
        analyzedCount += 1;
        setAnalysisProgress(
          Math.round((analyzedCount / uploadedPhotos.length) * 100),
        );
      }

      setPhotos(recognized);
      setAppliances(recognizedAppliances);
      setAnalysisState("ready");
      setStep(3);
    } catch (error) {
      console.error(error);
      setAnalysisState("error");
      setAnalysisError(
        error instanceof Error
          ? error.message
          : "Nie udało się rozpoznać urządzenia i wyszukać parametrów.",
      );
    }
  }

  function updateAppliance(id: string, updates: Partial<Appliance>) {
    setAppliances((current) =>
      current.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    );
  }

  function chooseApplication(nextApplication: ApplicationName) {
    setApplication(nextApplication);
    setAppliances(appliancesFor(nextApplication));
    setPhotos([]);
    setAnalysisState("idle");
    setFarmPowerSource(null);
    setEntryMode("photos");
    setShowDevicePicker(false);
    if (nextApplication === FARM_APPLICATION) setFarmZone("dairy");
  }

  function restart() {
    setStep(1);
    setApplication("Dom");
    setPhotos([]);
    setAppliances(appliancesFor("Dom"));
    setPhoneConnected(false);
    setAnalysisState("idle");
    setShowReport(false);
    setLocationQuery("");
    setLocationSearched(false);
    setSelectedDistributor("leszno");
    setPurchaseMode("distributor");
    setOrderSubmitted(false);
    setFarmPowerSource(null);
    setTractorAvailable(true);
    setFarmZone("dairy");
    setEntryMode("photos");
    setShowDevicePicker(false);
  }

  async function copyCaptureLink() {
    const captureUrl = `${window.location.origin}${window.location.pathname}?capture=${SESSION_CODE}&scope=${captureScope}&application=${application === FARM_APPLICATION ? "farm" : "general"}`;
    await navigator.clipboard?.writeText(captureUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  if (captureMode) {
    return (
      <MobileCapture
        code={captureMode}
        initialScope={captureScope}
        farmMode={mobileFarmMode}
        onExit={() => {
          window.history.replaceState({}, "", window.location.pathname);
          setCaptureMode(null);
        }}
      />
    );
  }

  const locationHint = locationQuery
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s/g, "");
  const locationBias =
    locationHint.startsWith("63-9") || locationHint.includes("rawicz")
      ? "rawicz"
      : locationHint.startsWith("5") || locationHint.includes("wroclaw")
        ? "wroclaw"
        : "leszno";
  const demoDistances: Record<string, Record<string, number>> = {
    leszno: { leszno: 7, rawicz: 36, wroclaw: 104 },
    rawicz: { leszno: 36, rawicz: 6, wroclaw: 73 },
    wroclaw: { leszno: 104, rawicz: 73, wroclaw: 11 },
  };
  const getDemoDistance = (distributorId: string) =>
    demoDistances[locationBias][distributorId] ?? 999;
  const nearbyDistributors = [...DISTRIBUTORS].sort((left, right) => {
    return getDemoDistance(left.id) - getDemoDistance(right.id);
  });
  const chosenDistributor =
    DISTRIBUTORS.find((item) => item.id === selectedDistributor) ??
    DISTRIBUTORS[0];
  const selectedFarmGenerator =
    farmPowerSource === "pto"
      ? farmCalculation.pto
      : farmCalculation.diesel;
  const largestStartingAppliance = calculation.chosen.reduce<Appliance | null>(
    (largest, item) =>
      largest === null ||
      item.watts * (item.startFactor - 1) >
        largest.watts * (largest.startFactor - 1)
        ? item
        : largest,
    null,
  );
  const hasThreePhase = calculation.chosen.some((item) => item.phase === "3F");

  const progress = [
    ["Start", "Wybierz sposób dodania"],
    ["Dodawanie", "Zdjęcia lub lista"],
    ["Weryfikacja", "Sprawdź dane"],
    ["Rekomendacja", "Dobór agregatu"],
    ["Zakup", "Dystrybutor lub FOGO"],
  ];

  return (
    <main className="site-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="FOGO Fogo Selector – demo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="brand-logo"
            src="/fogo-logo.jpg"
            alt="FOGO"
          />
          <span className="brand-sub">Fogo POWER SELECTOR</span>
        </a>
        <nav className="fogo-nav" aria-label="Nawigacja demonstracyjna">
          <span>Produkty</span>
          <span>O nas</span>
          <span>Informacje</span>
          <span>Kariera</span>
          <span>Kontakt</span>
        </nav>
        <div className="topbar-right">
          <span className="demo-badge">INTERAKTYWNE DEMO</span>
          <button className="text-button" onClick={restart}>
            Zacznij od nowa
          </button>
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar">
          <p className="eyebrow">INTELIGENTNY DOBÓR AGREGATU</p>
          <h1>
            Pokaż urządzenia.
            <br />
            Fogo policzy resztę.
          </h1>
          <p className="intro">
            Zwykłe zdjęcia urządzeń zamieniamy w zweryfikowaną rekomendację
            oraz gotowy raport dla handlowca.
          </p>

          <nav className="progress" aria-label="Postęp konfiguracji">
            {progress.map(([title, description], index) => {
              const number = index + 1;
              return (
                <button
                  key={title}
                  className={`progress-item ${step === number ? "active" : ""} ${
                    step > number ? "complete" : ""
                  }`}
                  onClick={() => {
                    if (number <= step || (number === 4 && step === 3)) {
                      setStep(number);
                    }
                  }}
                >
                  <span className="progress-number">
                    {step > number ? "✓" : number}
                  </span>
                  <span>
                    <strong>{title}</strong>
                    <small>{description}</small>
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="trust-points">
            <span>✓ Rozpoznanie urządzenia ze zwykłego zdjęcia</span>
            <span>✓ Model i parametry wyszukane w sieci</span>
            <span>✓ Pełny obchód lub tylko odbiorniki awaryjne</span>
            <span>✓ Moc rozruchowa i jednoczesność</span>
            <span>✓ Niepewne dane do potwierdzenia</span>
            <span>✓ Najbliższy dystrybutor i zakup</span>
          </div>
        </aside>

        <section className="panel">
          {step === 1 && (
            <div className="step-content start-step">
              <div className="step-heading">
                <div>
                  <p className="eyebrow red">NOWY SPOSÓB DOBORU</p>
                  <h2>Nie musisz znać mocy swoich urządzeń</h2>
                  <p>
                    Wybierz zastosowanie, a potem po prostu zrób zdjęcia. System
                    rozpozna urządzenia, znajdzie ich modele i parametry w
                    sieci, a dopyta tylko tam, gdzie wynik nie jest pewny.
                  </p>
                </div>
                <span className="time-chip">3–5 min</span>
              </div>

              <div className="application-chips" aria-label="Zastosowanie">
                {APPLICATIONS.map((item) => (
                  <button
                    key={item}
                    className={`${application === item ? "selected" : ""} ${
                      item === FARM_APPLICATION ? "farm-application" : ""
                    }`}
                    onClick={() => chooseApplication(item)}
                  >
                    {item === FARM_APPLICATION && <span>♧</span>}
                    {item}
                  </button>
                ))}
              </div>

              <section className="entry-paths" aria-label="Sposób dodania urządzeń">
                <button
                  className="entry-primary"
                  onClick={() => {
                    setEntryMode("photos");
                    setStep(2);
                  }}
                >
                  <span className="entry-camera-icon" aria-hidden="true">
                    <span />
                  </span>
                  <span className="entry-primary-copy">
                    <span className="entry-recommended">REKOMENDOWANE</span>
                    <strong>Zrób zdjęcia urządzeń</strong>
                    <small>
                      Zrób zwykłe zdjęcie. Fogo spróbuje znaleźć urządzenie i
                      jego parametry w sieci.
                    </small>
                    <span className="entry-photo-steps">
                      <b>1&nbsp; Zdjęcie</b>
                      <i>→</i>
                      <b>2&nbsp; Wyniki z sieci</b>
                      <i>→</i>
                      <b>3&nbsp; Potwierdzenie</b>
                    </span>
                  </span>
                  <span className="entry-primary-action">
                    Rozpocznij <b>→</b>
                  </span>
                </button>

                <div className="entry-secondary">
                  <button
                    className={`entry-secondary-card ${
                      showDevicePicker ? "selected" : ""
                    }`}
                    onClick={() => {
                      setEntryMode("list");
                      setShowDevicePicker((current) => !current);
                    }}
                    aria-expanded={showDevicePicker}
                  >
                    <span className="entry-small-icon">☷</span>
                    <span>
                      <strong>Wybierz z gotowej listy</strong>
                      <small>
                        Kliknij typowe odbiorniki i od razu zobacz bilans.
                      </small>
                    </span>
                    <b>{showDevicePicker ? "Zwiń ↑" : "Otwórz ↓"}</b>
                  </button>

                  <button
                    className="entry-secondary-card"
                    onClick={() => {
                      setEntryMode("manual");
                      if (!appliances.some((item) => item.selected)) {
                        setAppliances(appliancesFor(application, true));
                      }
                      setStep(3);
                    }}
                  >
                    <span className="entry-small-icon">✎</span>
                    <span>
                      <strong>Wpisz parametry ręcznie</strong>
                      <small>
                        Uzupełnij moc i priorytet każdego urządzenia.
                      </small>
                    </span>
                    <b>Przejdź →</b>
                  </button>
                </div>
              </section>

              {showDevicePicker && application !== FARM_APPLICATION && (
                <section className="application-reality-model">
                  <div className="application-model-heading">
                    <div>
                      <p className="eyebrow red">
                        INTERAKTYWNY MODEL •{" "}
                        {APPLICATION_DETAILS[application].short.toUpperCase()}
                      </p>
                      <h3>{APPLICATION_DETAILS[application].title}</h3>
                      <p>{APPLICATION_DETAILS[application].description}</p>
                    </div>
                    <div
                      className={`application-live-total ${
                        calculation.chosen.length === 0 ? "empty" : ""
                      }`}
                    >
                      <small>Wynik na żywo</small>
                      <strong>
                        {calculation.chosen.length === 0
                          ? "Wybierz urządzenia"
                          : `${calculation.chosen.length} urządzeń`}
                      </strong>
                      <span>
                        {calculation.chosen.length === 0
                          ? "moc pojawi się tutaj"
                          : calculation.target > 9500
                            ? `${(calculation.target / 1000)
                                .toFixed(1)
                                .replace(".", ",")} kW • dobór indywidualny`
                            : `${calculation.recommended.model} • ${calculation.recommended.power
                                .toFixed(1)
                                .replace(".", ",")} kW`}
                      </span>
                    </div>
                  </div>

                  <div
                    className={`application-scene application-${application
                      .toLowerCase()
                      .replace(/\s/g, "-")
                      .normalize("NFD")
                      .replace(/\p{Diacritic}/gu, "")}`}
                  >
                    <div className="application-scene-copy">
                      <span className="application-scene-kicker">
                        {application}
                      </span>
                      <strong>
                        Klikaj odbiorniki, aby zbudować własny scenariusz
                      </strong>
                      <p>
                        Po dodaniu zdjęć system wykona ten wybór automatycznie i
                        poprosi jedynie o potwierdzenie.
                      </p>
                    </div>
                    <div className="application-meter" aria-live="polite">
                      <span>
                        <small>Moc robocza</small>
                        <b>
                          {calculation.chosen.length === 0
                            ? "—"
                            : formatPower(calculation.continuous)}
                        </b>
                      </span>
                      <i />
                      <span>
                        <small>Z rozruchem</small>
                        <b>
                          {calculation.chosen.length === 0
                            ? "—"
                            : formatPower(calculation.startup)}
                        </b>
                      </span>
                      <i />
                      <span className="target">
                        <small>Z zapasem</small>
                        <b>
                          {calculation.chosen.length === 0
                            ? "—"
                            : formatPower(calculation.target)}
                        </b>
                      </span>
                    </div>
                  </div>

                  <div className="application-device-grid">
                    {appliances.map((device) => (
                      <button
                        key={device.id}
                        className={device.selected ? "selected" : ""}
                        onClick={() =>
                          updateAppliance(device.id, {
                            selected: !device.selected,
                          })
                        }
                      >
                        <span className="device-symbol">
                          {DEVICE_SYMBOLS[device.id] ?? "●"}
                        </span>
                        <span className="device-copy">
                          <strong>{device.name}</strong>
                          <small>
                            {device.phase} • {formatPower(device.watts)} •{" "}
                            rozruch ×{device.startFactor
                              .toFixed(1)
                              .replace(".", ",")}
                          </small>
                        </span>
                        <span className="device-select">
                          {device.selected ? "✓" : "+"}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="application-model-footer">
                    <p>
                      <span>i</span>
                      Wybór jest przykładowy — podczas obchodu listę utworzą
                      zdjęcia urządzeń.
                    </p>
                    <button
                      disabled={calculation.chosen.length === 0}
                      onClick={() => {
                        setEntryMode("list");
                        setStep(3);
                      }}
                    >
                      Sprawdź wybrane urządzenia <span>→</span>
                    </button>
                  </div>
                </section>
              )}

              {showDevicePicker && application === FARM_APPLICATION && (
                <section className="farm-reality-model">
                  <div className="farm-model-heading">
                    <div>
                      <p className="eyebrow red">INTERAKTYWNY MODEL GOSPODARSTWA</p>
                      <h3>Kliknij urządzenia, które mają działać podczas awarii</h3>
                      <p>
                        Zamiast zaczynać od tabeli, przejdź po rzeczywistych
                        strefach gospodarstwa. Każdy punkt możesz włączyć lub
                        wyłączyć z obliczeń.
                      </p>
                    </div>
                    <div
                      className={`farm-live-total ${
                        calculation.chosen.length === 0 ? "empty" : ""
                      }`}
                    >
                      <small>Aktualny bilans</small>
                      <strong>
                        {calculation.chosen.length === 0
                          ? "Wybierz urządzenia"
                          : `${calculation.chosen.length} urządzeń`}
                      </strong>
                      <span>
                        {calculation.chosen.length === 0
                          ? "moc pojawi się tutaj"
                          : `około ${farmCalculation.requiredKva
                              .toFixed(1)
                              .replace(".", ",")} kVA`}
                      </span>
                    </div>
                  </div>

                  <div className="farm-zone-tabs" role="tablist">
                    {FARM_ZONES.map((zone) => (
                      <button
                        key={zone.id}
                        className={farmZone === zone.id ? "selected" : ""}
                        onClick={() => setFarmZone(zone.id)}
                        role="tab"
                        aria-selected={farmZone === zone.id}
                      >
                        <span>{zone.id === "dairy" ? "01" : zone.id === "barn" ? "02" : "03"}</span>
                        <strong>{zone.label}</strong>
                        <small>{zone.description}</small>
                      </button>
                    ))}
                  </div>

                  {FARM_ZONES.filter((zone) => zone.id === farmZone).map(
                    (zone) => (
                      <div className="farm-scene-wrap" key={zone.id}>
                        <div className="farm-scene">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={zone.image} alt={zone.label} />
                          <span className="farm-scene-shade" />

                          {zone.devices.map((hotspot) => {
                            const device = appliances.find(
                              (item) => item.id === hotspot.applianceId,
                            );
                            if (!device) return null;
                            return (
                              <button
                                key={device.id}
                                className={`farm-hotspot ${
                                  device.selected ? "selected" : ""
                                }`}
                                style={{
                                  left: `${hotspot.x}%`,
                                  top: `${hotspot.y}%`,
                                }}
                                onClick={() =>
                                  updateAppliance(device.id, {
                                    selected: !device.selected,
                                  })
                                }
                                aria-label={`${device.selected ? "Usuń" : "Dodaj"} ${device.name}`}
                              >
                                <span>{device.selected ? "✓" : "+"}</span>
                                <b>{hotspot.number}</b>
                                <em>{device.name}</em>
                              </button>
                            );
                          })}

                          {zone.id === "power" && (
                            <div className="farm-power-preview">
                              <span>
                                <b>WOM / Agrovolt</b>
                                <small>niższy koszt, wymaga ciągnika</small>
                              </span>
                              <span>
                                <b>Diesel stacjonarny</b>
                                <small>niezależność i automatyczny start</small>
                              </span>
                            </div>
                          )}
                        </div>

                        {zone.devices.length > 0 ? (
                          <div className="farm-device-strip">
                            {zone.devices.map((hotspot) => {
                              const device = appliances.find(
                                (item) => item.id === hotspot.applianceId,
                              );
                              if (!device) return null;
                              return (
                                <button
                                  key={device.id}
                                  className={device.selected ? "selected" : ""}
                                  onClick={() =>
                                    updateAppliance(device.id, {
                                      selected: !device.selected,
                                    })
                                  }
                                >
                                  <span>{device.selected ? "✓" : "+"}</span>
                                  <span>
                                    <strong>{device.name}</strong>
                                    <small>
                                      {device.phase} • {formatPower(device.watts)} •
                                      {" "}
                                      {device.priority}
                                    </small>
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="farm-power-message">
                            <strong>
                              Najpierw policzymy zapotrzebowanie urządzeń.
                            </strong>
                            <p>
                              Dopiero w wyniku system dopasuje konkretny Agrovolt
                              na WOM i stacjonarny diesel o mocy wynikającej z
                              wybranych odbiorników.
                            </p>
                            <button
                              onClick={() => {
                                setEntryMode("photos");
                                setStep(2);
                              }}
                            >
                              Zrób zdjęcia w gospodarstwie →
                            </button>
                          </div>
                        )}
                      </div>
                    ),
                  )}

                  <div className="farm-model-footer">
                    <p>
                      <span>✓</span>
                      Wybrane urządzenia zostaną przeniesione do obchodu i
                      dalszych obliczeń.
                    </p>
                    <button
                      disabled={calculation.chosen.length === 0}
                      onClick={() => {
                        setEntryMode("list");
                        setStep(3);
                      }}
                    >
                      Sprawdź wybrane urządzenia <span>→</span>
                    </button>
                  </div>
                </section>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="step-content capture-step">
              <div className="step-heading">
                <div>
                  <p className="eyebrow red">KROK 2 Z 5</p>
                  <h2>Tryb obchodu: fotografuj kolejne odbiorniki</h2>
                  <p>
                    {captureScope === "emergency"
                      ? `Fotografuj tylko urządzenia, które mają działać w okresie zasilania awaryjnego${application === FARM_APPLICATION ? " w gospodarstwie" : ""}.`
                      : `Fotografuj wszystkie odbiorniki${application === FARM_APPLICATION ? " w gospodarstwie" : ""}. Na końcu wybierzesz te, które mają działać podczas awarii.`}
                  </p>
                </div>
                {phoneConnected ? (
                  <span className="connection-chip connected">
                    ● TELEFON POŁĄCZONY
                  </span>
                ) : (
                  <span className="connection-chip">SESJA {SESSION_CODE}</span>
                )}
              </div>

              <section className="scope-selector" aria-label="Zakres obchodu">
                <div>
                  <strong>Co fotografujesz podczas obchodu?</strong>
                  <p>Ten wybór zostanie przeniesiony na telefon.</p>
                </div>
                <div className="scope-toggle">
                  <button
                    className={
                      captureScope === "emergency" ? "selected" : ""
                    }
                    onClick={() => setCaptureScope("emergency")}
                  >
                    <span>⚡</span>
                    <strong>Tylko zasilanie awaryjne</strong>
                    <small>Najszybszy dobór agregatu</small>
                  </button>
                  <button
                    className={
                      captureScope === "inventory" ? "selected" : ""
                    }
                    onClick={() => setCaptureScope("inventory")}
                  >
                    <span>⌂</span>
                    <strong>Wszystkie odbiorniki</strong>
                    <small>Pełna inwentaryzacja domu lub firmy</small>
                  </button>
                </div>
              </section>

              <div className="capture-actions">
                <button
                  className="capture-card phone-card"
                  onClick={() => setShowPhone(true)}
                >
                  <span className="capture-icon phone-shape">▯</span>
                  <span>
                    <strong>Przejdź na telefon</strong>
                    <small>
                      Zeskanuj kod QR i rozpocznij prowadzony obchód. Zdjęcia
                      wrócą do tej sesji bez przesyłania plików.
                    </small>
                  </span>
                  <b>Połącz →</b>
                </button>

                <label className="capture-card upload-card">
                  <span className="capture-icon">↑</span>
                  <span>
                    <strong>Dodaj zdjęcia tutaj</strong>
                    <small>
                      Zdjęcie całego urządzenia • JPG, PNG lub WebP • maks. 8
                    </small>
                  </span>
                  <b>Wybierz pliki</b>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={addPhotos}
                  />
                </label>
              </div>

              {photos.length === 0 ? (
                <div className="empty-capture">
                  <div className="scan-frame">
                    <span />
                  </div>
                  <div>
                    <strong>Nie masz teraz urządzeń pod ręką?</strong>
                    <p>
                      Uruchom przykładową analizę{" "}
                      {application === FARM_APPLICATION
                        ? "gospodarstwa"
                        : "domu"}{" "}
                      i zobacz cały proces.
                    </p>
                  </div>
                  <button
                    className="secondary-button"
                    onClick={() => loadSample()}
                  >
                    Wczytaj zestaw demo
                  </button>
                </div>
              ) : (
                <div className="photo-section">
                  <div className="photo-section-head">
                    <div>
                      <strong>Zdjęcia w sesji</strong>
                      <small>
                        {photos.length} plików • gotowe do analizy
                      </small>
                    </div>
                    <button
                      className="small-link"
                      onClick={() => setPhotos([])}
                    >
                      Usuń wszystkie
                    </button>
                  </div>
                  <div className="photo-grid">
                    {photos.map((photo) => (
                      <PhotoTile key={photo.id} photo={photo} />
                    ))}
                  </div>
                </div>
              )}

              {(analysisState === "loading-model" ||
                analysisState === "analyzing") && (
                <div className="analysis-overlay" role="status">
                  <div className="ai-orb">Fogo</div>
                  <div>
                    <strong>
                      {analysisState === "loading-model"
                        ? "Przygotowuję zdjęcia do rozpoznania…"
                        : "Rozpoznaję model i szukam parametrów w sieci…"}
                    </strong>
                    <span className="analysis-track">
                      <i
                        style={{
                          width: `${Math.max(8, analysisProgress)}%`,
                        }}
                      />
                    </span>
                    <small>
                      {analysisState === "loading-model"
                        ? "Zdjęcie tabliczki znamionowej nie jest wymagane"
                        : `${analysisProgress}% • producent, model, moc, rozruch i źródła`}
                    </small>
                  </div>
                </div>
              )}

              {analysisState === "error" && (
                <div className="analysis-connection-needed" role="alert">
                  <span>!</span>
                  <div>
                    <strong>Nie udało się uruchomić rozpoznawania</strong>
                    <p>{analysisError}</p>
                  </div>
                  <button onClick={() => void analyze()}>
                    Spróbuj ponownie
                  </button>
                </div>
              )}

              <div className="panel-footer">
                <button className="secondary-button" onClick={() => setStep(1)}>
                  ← Wstecz
                </button>
                <button
                  className="primary-button"
                  disabled={
                    photos.length === 0 ||
                    analysisState === "loading-model" ||
                    analysisState === "analyzing" ||
                    analysisState === "ready"
                  }
                  onClick={() => void analyze()}
                >
                  Uruchom analizę Fogo <span>→</span>
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="step-content verify-step">
              <div className="step-heading">
                <div>
                  <p className="eyebrow red">
                    {entryMode === "photos"
                      ? "ANALIZA ZAKOŃCZONA"
                      : entryMode === "list"
                        ? "WYBRANE URZĄDZENIA"
                        : "TRYB RĘCZNY"}
                  </p>
                  <h2>
                    {entryMode === "photos"
                      ? `Fogo rozpoznało ${Math.max(photos.filter((photo) => photo.recognitionStatus === "recognized").length, calculation.chosen.length)} urządzeń`
                      : entryMode === "list"
                        ? "Sprawdź urządzenia przed obliczeniem"
                        : "Uzupełnij parametry urządzeń"}
                  </h2>
                  <p>
                    {entryMode === "photos" ? (
                      <>
                        {captureScope === "emergency"
                          ? "Wszystkie pozycje oznaczono jako wymagane w okresie zasilania awaryjnego."
                          : "Do bilansu trafią tylko odbiorniki oznaczone podczas pełnego obchodu."}{" "}
                        Wysoka pewność:{" "}
                        {
                          appliances.filter((item) => item.confidence >= 80)
                            .length
                        }{" "}
                        z {appliances.length}.
                      </>
                    ) : (
                      "Zaznacz pozycje, popraw moc lub priorytet i przejdź do rekomendacji."
                    )}
                  </p>
                </div>
                {entryMode === "photos" && (
                  <span className="result-status">✓ WYNIK Fogo GOTOWY</span>
                )}
              </div>

              {entryMode === "photos" && (
                <div className="verification-banner">
                  <span className="ai-orb small">Fogo</span>
                  <div>
                    <strong>
                      Rozpoznano urządzenia i wyszukano ich parametry w sieci
                    </strong>
                    <p>
                      Sprawdź model, moc, rozruch i źródło danych. Gdy kilka
                      wersji urządzenia wygląda identycznie, wynik jest
                      oznaczony jako wymagający potwierdzenia.
                    </p>
                  </div>
                  <button onClick={() => setStep(2)}>Dodaj inne zdjęcie</button>
                </div>
              )}

              <div className="detected-list">
                {appliances.map((item) => (
                  <div
                    className={`detected-row ${
                      item.confidence < 80 ? "uncertain" : ""
                    }`}
                    key={item.id}
                  >
                    <button
                      className={`checkbox ${item.selected ? "checked" : ""}`}
                      onClick={() =>
                        updateAppliance(item.id, {
                          selected: !item.selected,
                        })
                      }
                      aria-label={`Uwzględnij ${item.name}`}
                    >
                      {item.selected ? "✓" : ""}
                    </button>
                    <div className="detected-copy">
                      <strong>{item.name}</strong>
                      <small>{item.source}</small>
                      {item.parameterSourceUrl && (
                        <a
                          href={item.parameterSourceUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {item.parameterSourceTitle || "Źródło parametrów"} ↗
                        </a>
                      )}
                    </div>
                    <label className="power-input">
                      <input
                        type="number"
                        value={item.watts}
                        min="10"
                        max="1000000"
                        onChange={(event) =>
                          updateAppliance(item.id, {
                            watts: clamp(
                              Number(event.target.value),
                              10,
                              1000000,
                            ),
                          })
                        }
                      />
                      <span>W</span>
                    </label>
                    <select
                      value={item.priority}
                      onChange={(event) =>
                        updateAppliance(item.id, {
                          priority: event.target
                            .value as Appliance["priority"],
                        })
                      }
                      aria-label={`Priorytet ${item.name}`}
                    >
                      <option>Krytyczny</option>
                      <option>Ważny</option>
                      <option>Opcjonalny</option>
                    </select>
                    <span
                      className={`confidence ${
                        item.confidence < 80 ? "low" : ""
                      }`}
                    >
                      {item.confidence}% pewności
                    </span>
                  </div>
                ))}
              </div>

              <div className="strategy-box">
                <div>
                  <strong>Jak urządzenia mają pracować?</strong>
                  <p>
                    Fogo może zmniejszyć wymagany agregat, pilnując kolejności
                    załączania dużych odbiorników.
                  </p>
                </div>
                <div className="strategy-toggle">
                  <button
                    className={loadStrategy === "priority" ? "selected" : ""}
                    onClick={() => setLoadStrategy("priority")}
                  >
                    Inteligentne priorytety
                    <small>Niższa moc i koszt</small>
                  </button>
                  <button
                    className={loadStrategy === "all" ? "selected" : ""}
                    onClick={() => setLoadStrategy("all")}
                  >
                    Wszystko jednocześnie
                    <small>Maksymalny komfort</small>
                  </button>
                </div>
              </div>

              <div className="panel-footer">
                <button
                  className="secondary-button"
                  onClick={() => setStep(entryMode === "photos" ? 2 : 1)}
                >
                  {entryMode === "photos" ? "← Zmień zdjęcia" : "← Wróć do wyboru"}
                </button>
                <button
                  className="primary-button"
                  disabled={calculation.chosen.length === 0}
                  onClick={() => setStep(4)}
                >
                  {calculation.chosen.length === 0
                    ? "Wybierz przynajmniej jedno urządzenie"
                    : "Potwierdź i dobierz agregat"}{" "}
                  <span>→</span>
                </button>
              </div>
            </div>
          )}

          {step === 4 && application === FARM_APPLICATION && (
            <div className="step-content result-step farm-result-step">
              <div className="step-heading result-heading">
                <div>
                  <p className="eyebrow red">
                    REKOMENDACJA DLA GOSPODARSTWA ROLNEGO
                  </p>
                  <h2>
                    Potrzebujesz około{" "}
                    {farmCalculation.requiredKva.toFixed(1).replace(".", ",")}{" "}
                    kVA
                  </h2>
                  <p>
                    Bilans uwzględnia odbiorniki trójfazowe, największy rozruch,
                    jednoczesność pracy i 15% zapasu. Teraz wybierz sposób
                    zasilania: napęd z WOM ciągnika albo niezależny agregat
                    stacjonarny diesel.
                  </p>
                </div>
                <span className="result-status">✓ BILANS MOCY GOTOWY</span>
              </div>

              <div className="farm-power-summary">
                <div>
                  <small>Moc robocza</small>
                  <strong>{formatPower(calculation.continuous)}</strong>
                </div>
                <span>→</span>
                <div>
                  <small>Obciążenie z rozruchem</small>
                  <strong>{formatPower(calculation.startup)}</strong>
                </div>
                <span>→</span>
                <div className="farm-kva-target">
                  <small>Wymagana moc agregatu</small>
                  <strong>
                    {farmCalculation.requiredKva
                      .toFixed(1)
                      .replace(".", ",")}{" "}
                    kVA
                  </strong>
                </div>
              </div>

              {farmCalculation.exceedsRange && (
                <div className="farm-range-warning">
                  <span>!</span>
                  <p>
                    Obliczona moc przekracza zakres tej wersji konfiguratora.
                    Wynik wymaga indywidualnego doboru przez dział techniczny
                    FOGO.
                  </p>
                </div>
              )}

              <section className="tractor-check">
                <div>
                  <p className="eyebrow">WARUNEK DLA WOM</p>
                  <strong>
                    Czy podczas awarii masz dostępny ciągnik z WOM?
                  </strong>
                  <small>
                    Jego moc i parametry wału zostaną ostatecznie sprawdzone z
                    kartą wybranego modelu Agrovolt.
                  </small>
                </div>
                <div className="tractor-toggle">
                  <button
                    className={tractorAvailable ? "selected" : ""}
                    onClick={() => {
                      setTractorAvailable(true);
                      setFarmPowerSource(null);
                    }}
                  >
                    Tak, mam ciągnik
                  </button>
                  <button
                    className={!tractorAvailable ? "selected" : ""}
                    onClick={() => {
                      setTractorAvailable(false);
                      setFarmPowerSource(null);
                    }}
                  >
                    Nie / ma być niezależnie
                  </button>
                </div>
              </section>

              <div className="farm-choice-heading">
                <div>
                  <p className="eyebrow red">WYBIERZ ŹRÓDŁO ZASILANIA</p>
                  <h3>
                    {farmCalculation.exceedsRange
                      ? "Wymagany indywidualny dobór powyżej 60 kVA"
                      : "Oba warianty pokrywają obliczone zapotrzebowanie"}
                  </h3>
                </div>
                <span>Oferta FOGO do 60 kVA mocy znamionowej</span>
              </div>

              <div className="farm-source-grid">
                <article
                  className={`farm-source-card pto ${
                    farmPowerSource === "pto" ? "selected" : ""
                  } ${!tractorAvailable ? "less-suitable" : ""}`}
                >
                  <button
                    className="farm-select-button"
                    disabled={farmCalculation.exceedsRange}
                    onClick={() => setFarmPowerSource("pto")}
                  >
                    <span className="farm-card-top">
                      <span className="farm-type-icon">WOM</span>
                      {tractorAvailable && (
                        <b className="farm-recommendation">
                          EKONOMICZNY WYBÓR
                        </b>
                      )}
                    </span>
                    <span className="farm-product-image pto">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/farm-power.webp"
                        alt="Agregat rolniczy na WOM połączony z ciągnikiem"
                      />
                    </span>
                    <span className="farm-family">
                      AGROVOLT • AGREGAT TRAKTOROWY
                    </span>
                    <strong className="farm-model">
                      {farmCalculation.pto.model}
                    </strong>
                    <span className="farm-main-spec">
                      {farmCalculation.pto.maxKva.toFixed(1).replace(".", ",")}{" "}
                      kVA maks. • 400/230 V
                    </span>
                    <span className="farm-spec-grid">
                      <span>
                        <small>Moc znamionowa</small>
                        <b>{farmCalculation.pto.nominalKva} kVA</b>
                      </span>
                      <span>
                        <small>Regulacja napięcia</small>
                        <b>{farmCalculation.pto.regulation}</b>
                      </span>
                    </span>
                    <span className="farm-benefits">
                      <span>✓ wykorzystuje silnik ciągnika</span>
                      <span>✓ prostsze i tańsze źródło awaryjne</span>
                      <span>• wymaga operatora i dostępnego ciągnika</span>
                    </span>
                    <span className="farm-pick">
                      {farmPowerSource === "pto"
                        ? "✓ Wybrano WOM"
                        : "Wybieram WOM →"}
                    </span>
                  </button>
                  <a
                    href={farmCalculation.pto.productUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Zobacz model Agrovolt na fogo.pl ↗
                  </a>
                </article>

                <article
                  className={`farm-source-card diesel ${
                    farmPowerSource === "diesel" ? "selected" : ""
                  } ${tractorAvailable ? "" : "recommended"} `}
                >
                  <button
                    className="farm-select-button"
                    disabled={farmCalculation.exceedsRange}
                    onClick={() => setFarmPowerSource("diesel")}
                  >
                    <span className="farm-card-top">
                      <span className="farm-type-icon">DIESEL</span>
                      {!tractorAvailable && (
                        <b className="farm-recommendation">REKOMENDOWANY</b>
                      )}
                    </span>
                    <span className="farm-product-image diesel">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/farm-power.webp"
                        alt="Stacjonarny agregat diesel przy budynku gospodarczym"
                      />
                    </span>
                    <span className="farm-family">
                      STACJONARNY • NIEZALEŻNE ZASILANIE
                    </span>
                    <strong className="farm-model">
                      {farmCalculation.diesel.model}
                    </strong>
                    <span className="farm-main-spec">
                      {farmCalculation.diesel.maxKva.toFixed(1).replace(".", ",")}{" "}
                      kVA ESP • 400 V
                    </span>
                    <span className="farm-spec-grid">
                      <span>
                        <small>Moc znamionowa PRP</small>
                        <b>{farmCalculation.diesel.nominalKva} kVA</b>
                      </span>
                      <span>
                        <small>Regulacja napięcia</small>
                        <b>{farmCalculation.diesel.regulation}</b>
                      </span>
                    </span>
                    <span className="farm-benefits">
                      <span>✓ pracuje niezależnie od ciągnika</span>
                      <span>✓ możliwość automatycznego startu</span>
                      <span>• rozwiązanie stacjonarne i całoroczne</span>
                    </span>
                    <span className="farm-pick">
                      {farmPowerSource === "diesel"
                        ? "✓ Wybrano diesel"
                        : "Wybieram diesel →"}
                    </span>
                  </button>
                  <a
                    href={farmCalculation.diesel.productUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Zobacz agregaty diesel na fogo.pl ↗
                  </a>
                </article>
              </div>

              <div className="farm-decision-note">
                <span>i</span>
                <p>
                  {tractorAvailable
                    ? "Masz dostępny ciągnik, dlatego Agrovolt na WOM może być wariantem ekonomicznym. Diesel pozostaje lepszy, gdy liczy się automatyczny start i pełna niezależność."
                    : "Bez dostępnego ciągnika system rekomenduje agregat stacjonarny diesel. Wariant WOM pozostawiamy do porównania, ale wymaga zapewnienia odpowiedniego ciągnika."}
                </p>
              </div>

              <div className="disclaimer">
                * Dane demonstracyjne. Ostateczny dobór musi uwzględniać
                instalację gospodarstwa, bilans faz, kolejność rozruchu, układ
                SZR oraz — dla WOM — parametry ciągnika i wału napędowego.
              </div>

              <div className="panel-footer">
                <button className="secondary-button" onClick={() => setStep(3)}>
                  ← Zmień założenia
                </button>
                <button
                  className="primary-button"
                  disabled={
                    farmPowerSource === null || farmCalculation.exceedsRange
                  }
                  onClick={() => setStep(5)}
                >
                  {farmCalculation.exceedsRange
                    ? "Zakres powyżej 60 kVA"
                    : farmPowerSource === null
                    ? "Wybierz WOM albo diesel"
                    : "Znajdź dystrybutora"}{" "}
                  <span>→</span>
                </button>
              </div>
            </div>
          )}

          {step === 4 && application !== FARM_APPLICATION && (
            <div className="step-content result-step">
              <div className="step-heading result-heading">
                <div>
                  <p className="eyebrow red">REKOMENDACJA NA PODSTAWIE ZDJĘĆ</p>
                  <h2>
                    {calculation.exceedsPortable
                      ? "Wymagany dobór z większej serii"
                      : `${calculation.recommended.model} — optymalny dobór`}
                  </h2>
                  <p>
                    Rekomendacja uwzględnia największy rozruch, priorytety
                    odbiorników i 15% zapasu bezpieczeństwa. Bilans powstał w
                    trybie{" "}
                    {captureScope === "emergency"
                      ? "tylko zasilanie awaryjne"
                      : "pełnego obchodu"}.
                  </p>
                </div>
                <span className="result-status">✓ DOBÓR GOTOWY</span>
              </div>

              {calculation.exceedsPortable && (
                <div className="farm-range-warning">
                  <span>!</span>
                  <p>
                    Próg {formatPower(calculation.target)} przekracza zakres
                    przenośnych modeli pokazanych w tym demonstratorze. System
                    nie przypisuje na siłę największego modelu — wynik powinien
                    przejść do doboru stacjonarnego przez dział techniczny FOGO.
                  </p>
                </div>
              )}

              {!calculation.exceedsPortable && <div className="result-layout">
                <section className="main-result">
                  <div className="power-summary">
                    <div>
                      <small>Moc robocza</small>
                      <strong>{formatPower(calculation.continuous)}</strong>
                    </div>
                    <span>+</span>
                    <div>
                      <small>Szczyt rozruchowy</small>
                      <strong>{formatPower(calculation.startup)}</strong>
                    </div>
                    <span>→</span>
                    <div className="target-power">
                      <small>Próg z zapasem</small>
                      <strong>{formatPower(calculation.target)}</strong>
                    </div>
                  </div>

                  <article className="generator-card featured">
                    <div className="generator-visual">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={calculation.recommended.image}
                        alt={`Agregat FOGO ${calculation.recommended.model}`}
                      />
                    </div>
                    <div className="generator-copy">
                      <span className="recommended-label">REKOMENDOWANY</span>
                      <p>
                        {hasThreePhase
                          ? "Agregat trójfazowy 400/230 V"
                          : "Agregat jednofazowy 230 V"}
                      </p>
                      <h3>{calculation.recommended.model}</h3>
                      <div className="generator-specs">
                        <span>
                          <small>Moc maksymalna</small>
                          <strong>{calculation.recommended.power} kW</strong>
                        </span>
                        <span>
                          <small>Regulacja</small>
                          <strong>{calculation.recommended.regulation}</strong>
                        </span>
                        <span>
                          <small>Paliwo / silnik</small>
                          <strong>{calculation.recommended.engine}</strong>
                        </span>
                      </div>
                      <a
                        className="product-link"
                        href={calculation.recommended.productUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Zobacz kartę produktu na fogo.pl <span>↗</span>
                      </a>
                    </div>
                  </article>

                  <div className="variants">
                    <div>
                      <span>MINIMUM</span>
                      <strong>{calculation.minimum.model}</strong>
                      <small>{calculation.minimum.power} kW</small>
                    </div>
                    <div className="active">
                      <span>OPTYMALNY</span>
                      <strong>{calculation.recommended.model}</strong>
                      <small>{calculation.recommended.power} kW</small>
                    </div>
                    <div>
                      <span>REZERWA</span>
                      <strong>{calculation.reserve.model}</strong>
                      <small>{calculation.reserve.power} kW</small>
                    </div>
                  </div>
                </section>

                <aside className="decision-panel">
                  <p className="eyebrow">DLACZEGO TEN MODEL?</p>
                  <ul>
                    <li>
                      <span>01</span>
                      <p>
                        Obsługuje największy rozruch:
                        <strong>
                          {" "}
                          {largestStartingAppliance?.name.toLowerCase() ??
                            "największego odbiornika"}
                        </strong>
                      </p>
                    </li>
                    <li>
                      <span>02</span>
                      <p>
                        Uwzględnia odbiorniki
                        <strong>
                          {" "}
                          {hasThreePhase ? "trójfazowe i jednofazowe" : "230 V"}
                        </strong>
                      </p>
                    </li>
                    <li>
                      <span>03</span>
                      <p>
                        Plan priorytetów ogranicza zbędne
                        <strong> przewymiarowanie</strong>
                      </p>
                    </li>
                  </ul>
                  <div className="runtime-card">
                    <small>Szacowany czas pracy*</small>
                    <strong>7–9 godzin</strong>
                    <span>przy typowym obciążeniu awaryjnym</span>
                  </div>
                </aside>
              </div>}

              {!showReport ? (
                <div className="lead-bar">
                  <div>
                    <strong>Gotowy pakiet dla handlowca i instalatora</strong>
                    <p>
                      Zdjęcia, znalezione źródła, parametry, niepewności i
                      rekomendacja w jednym raporcie.
                    </p>
                  </div>
                  <button
                    className="primary-button"
                    onClick={() => setShowReport(true)}
                  >
                    Przygotuj raport <span>→</span>
                  </button>
                </div>
              ) : (
                <div className="report-ready" role="status">
                  <span className="report-icon">✓</span>
                  <div>
                    <strong>Raport techniczny i lead są gotowe</strong>
                    <p>
                      Handlowiec widzi podstawę każdego obliczenia i od razu
                      wie, o co dopytać klienta.
                    </p>
                  </div>
                  <button>Podgląd raportu PDF</button>
                </div>
              )}

              <div className="disclaimer">
                * Dane demonstracyjne. Ostateczny dobór, sposób podłączenia,
                zabezpieczenia i czas pracy wymagają potwierdzenia przez
                specjalistę oraz zespół techniczny producenta.
              </div>

              <div className="panel-footer">
                <button className="secondary-button" onClick={() => setStep(3)}>
                  ← Zmień założenia
                </button>
                <button className="primary-button" onClick={() => setStep(5)}>
                  Sprawdź zakup i dystrybutorów <span>→</span>
                </button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="step-content purchase-step">
              <div className="step-heading">
                <div>
                  <p className="eyebrow red">OSTATNI KROK</p>
                  <h2>Znajdź najbliższego dystrybutora FOGO</h2>
                  <p>
                    Wystarczy kod pocztowy. Pełny adres możesz podać dopiero
                    przy zamówieniu lub dostawie.{" "}
                    {application === FARM_APPLICATION &&
                      `Wybrany wariant: ${
                        farmPowerSource === "pto" ? "Agrovolt na WOM" : "diesel"
                      }.`}
                  </p>
                </div>
                <span className="result-status">✓ DOBÓR ZAPISANY</span>
              </div>

              <section className="location-search">
                <div className="location-copy">
                  <span className="location-pin">⌖</span>
                  <div>
                    <strong>Gdzie ma trafić agregat?</strong>
                    <small>
                      Podaj kod pocztowy, miejscowość albo adres zamieszkania
                    </small>
                  </div>
                </div>
                <form
                  className="location-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const first = nearbyDistributors[0];
                    setSelectedDistributor(first.id);
                    setLocationSearched(true);
                    setOrderSubmitted(false);
                  }}
                >
                  <label>
                    <span>Kod pocztowy lub adres</span>
                    <input
                      value={locationQuery}
                      onChange={(event) => {
                        setLocationQuery(event.target.value);
                        setLocationSearched(false);
                        setOrderSubmitted(false);
                      }}
                      placeholder="np. 64-100 lub Leszno"
                      autoComplete="postal-code"
                    />
                  </label>
                  <button
                    type="submit"
                    className="primary-button"
                    disabled={locationQuery.trim().length < 2}
                  >
                    Pokaż najbliższych <span>→</span>
                  </button>
                </form>
                <p className="location-privacy">
                  Na tym etapie lokalizacja służy wyłącznie do dopasowania
                  sprzedawcy. W demo adres nie jest zapisywany.
                </p>
              </section>

              {!locationSearched ? (
                <div className="dealer-empty">
                  <span>01</span>
                  <div>
                    <strong>Najpierw podaj swoją okolicę</strong>
                    <p>
                      System pokaże najbliższe punkty, dostępność wybranego
                      modelu i możliwy serwis.
                    </p>
                  </div>
                  <div>
                    <span>02</span>
                    <strong>Potem wybierzesz sposób zakupu</strong>
                    <p>
                      Lokalnie u partnera albo bezpośrednio w FOGO z prowizją
                      przypisaną wybranemu dystrybutorowi.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="purchase-grid">
                    <section className="dealer-results">
                      <div className="section-title">
                        <div>
                          <p className="eyebrow red">NAJBLIŻSZE PUNKTY</p>
                          <strong>Wybierz swojego dystrybutora</strong>
                        </div>
                        <span>DANE DEMONSTRACYJNE</span>
                      </div>

                      <div className="dealer-list">
                        {nearbyDistributors.map((dealer, index) => {
                          const distance = getDemoDistance(dealer.id);
                          return (
                            <button
                              key={dealer.id}
                              className={`dealer-card ${
                                selectedDistributor === dealer.id
                                  ? "selected"
                                  : ""
                              }`}
                              onClick={() => {
                                setSelectedDistributor(dealer.id);
                                setOrderSubmitted(false);
                              }}
                            >
                              <span className="dealer-radio">
                                {selectedDistributor === dealer.id ? "✓" : ""}
                              </span>
                              <span className="dealer-copy">
                                <b>
                                  {index === 0 && (
                                    <em>NAJBLIŻEJ</em>
                                  )}
                                  {dealer.name}
                                </b>
                                <small>
                                  {dealer.address}, {dealer.postalCode}{" "}
                                  {dealer.city}
                                </small>
                                <span>
                                  {dealer.service
                                    ? "✓ Sprzedaż i serwis"
                                    : "✓ Punkt sprzedaży"}{" "}
                                  • {dealer.availability}
                                </span>
                              </span>
                              <strong>{distance} km</strong>
                            </button>
                          );
                        })}
                      </div>
                    </section>

                    <aside className="purchase-summary">
                      <p className="eyebrow">WYBRANY ZESTAW</p>
                      <div className="summary-product">
                        {application === FARM_APPLICATION ? (
                          <span
                            className={`summary-farm-icon ${
                              farmPowerSource === "pto" ? "pto" : "diesel"
                            }`}
                          >
                            {farmPowerSource === "pto" ? "WOM" : "D"}
                          </span>
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            className="summary-product-image"
                            src={calculation.recommended.image}
                            alt=""
                          />
                        )}
                        <div>
                          <small>
                            {application === FARM_APPLICATION
                              ? farmPowerSource === "pto"
                                ? "Agrovolt • WOM • 400/230 V"
                                : "Stacjonarny diesel • 400 V"
                              : "Agregat 230 V"}
                          </small>
                          <strong>
                            {application === FARM_APPLICATION
                              ? selectedFarmGenerator.model
                              : calculation.recommended.model}
                          </strong>
                          <span>
                            {application === FARM_APPLICATION
                              ? `${selectedFarmGenerator.nominalKva} kVA PRP • ${selectedFarmGenerator.regulation}`
                              : `${calculation.recommended.power} kW • ${calculation.recommended.regulation}`}
                          </span>
                        </div>
                      </div>
                      <dl>
                        <div>
                          <dt>Dystrybutor</dt>
                          <dd>{chosenDistributor.name}</dd>
                        </div>
                        <div>
                          <dt>Dostępność</dt>
                          <dd>{chosenDistributor.availability}</dd>
                        </div>
                        <div>
                          <dt>Cena</dt>
                          <dd>do potwierdzenia</dd>
                        </div>
                      </dl>
                    </aside>
                  </div>

                  <section className="buy-channel">
                    <div className="section-title">
                      <div>
                        <p className="eyebrow red">SPOSÓB ZAKUPU</p>
                        <strong>Wybierz, kto ma zrealizować zamówienie</strong>
                      </div>
                    </div>
                    <div className="buy-options">
                      <button
                        className={
                          purchaseMode === "distributor" ? "selected" : ""
                        }
                        onClick={() => {
                          setPurchaseMode("distributor");
                          setOrderSubmitted(false);
                        }}
                      >
                        <span className="buy-radio">
                          {purchaseMode === "distributor" ? "✓" : ""}
                        </span>
                        <span>
                          <em>ZAKUP LOKALNY</em>
                          <strong>Kup u wybranego dystrybutora</strong>
                          <small>
                            Kontakt, płatność i odbiór lub dostawę ustalasz
                            bezpośrednio z {chosenDistributor.name}.
                          </small>
                        </span>
                      </button>
                      <button
                        className={purchaseMode === "fogo" ? "selected" : ""}
                        onClick={() => {
                          setPurchaseMode("fogo");
                          setOrderSubmitted(false);
                        }}
                      >
                        <span className="buy-radio">
                          {purchaseMode === "fogo" ? "✓" : ""}
                        </span>
                        <span>
                          <em>ZAKUP BEZPOŚREDNI</em>
                          <strong>Kup bezpośrednio w FOGO</strong>
                          <small>
                            Zamówienie realizuje producent, a wybrany partner
                            pozostaje przypisany do transakcji.
                          </small>
                        </span>
                      </button>
                    </div>

                    {purchaseMode === "fogo" && (
                      <div className="commission-note">
                        <span>↗</span>
                        <div>
                          <strong>
                            Prowizja zostanie przypisana do{" "}
                            {chosenDistributor.name}
                          </strong>
                          <p>
                            Klient może kupić bezpośrednio w FOGO, bez pomijania
                            lokalnego partnera, który został przez niego wybrany.
                          </p>
                        </div>
                      </div>
                    )}

                    {!orderSubmitted ? (
                      <div className="purchase-action">
                        <p>
                          Kliknięcie w demo nie tworzy prawdziwego zamówienia.
                        </p>
                        <button
                          className="primary-button"
                          onClick={() => setOrderSubmitted(true)}
                        >
                          {purchaseMode === "fogo"
                            ? "Przejdź do zamówienia w FOGO"
                            : "Wyślij zapytanie do dystrybutora"}{" "}
                          <span>→</span>
                        </button>
                      </div>
                    ) : (
                      <div className="order-success" role="status">
                        <span>✓</span>
                        <div>
                          <strong>
                            {purchaseMode === "fogo"
                              ? "Koszyk FOGO został przygotowany"
                              : "Zapytanie jest gotowe do wysłania"}
                          </strong>
                          <p>
                            Dobór, raport Fogo i wybrany dystrybutor zostały
                            połączone w jednym leadzie sprzedażowym.
                          </p>
                        </div>
                      </div>
                    )}
                  </section>
                </>
              )}

              <div className="integration-note">
                <strong>Docelowe wdrożenie:</strong> lista dystrybutorów
                wgrywana z CSV lub synchronizowana z CRM/ERP FOGO; odległość,
                dostępność i przypisanie prowizji wyliczane automatycznie.
              </div>

              <div className="panel-footer">
                <button className="secondary-button" onClick={() => setStep(4)}>
                  ← Wróć do rekomendacji
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      <footer className="site-footer">
        <span>
          Niezależny prototyp koncepcyjny — nie jest oficjalnym narzędziem FOGO.
        </span>
        <span>
          Analiza dodanych zdjęć działa przez Gemini. Synchronizacja sesji z
          drugim urządzeniem pozostaje funkcją demonstracyjną.
        </span>
      </footer>

      {showPhone && (
        <div className="modal-backdrop" onMouseDown={() => setShowPhone(false)}>
          <section
            className="phone-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="phone-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setShowPhone(false)}
              aria-label="Zamknij"
            >
              ×
            </button>
            <div className="modal-copy">
              <p className="eyebrow red">POŁĄCZ TELEFON</p>
              <h2 id="phone-title">Zdjęcia wrócą do tej samej sesji</h2>
              <ol>
                <li>
                  <span>1</span> Zeskanuj kod aparatem telefonu
                </li>
                <li>
                  <span>2</span>{" "}
                  {captureScope === "emergency"
                    ? "Fotografuj tylko odbiorniki awaryjne"
                    : "Fotografuj wszystko i oznacz odbiorniki awaryjne"}
                </li>
                <li>
                  <span>3</span> Wróć tutaj — analiza uruchomi się automatycznie
                </li>
              </ol>
              <div className="session-security">
                <strong>Sesja {SESSION_CODE}</strong>
                <small>Bez logowania • link wygasa po 30 minutach</small>
              </div>
            </div>
            <div className="qr-panel">
              <div className="qr-frame">
                {qrData ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrData} alt={`Kod QR sesji ${SESSION_CODE}`} />
                ) : (
                  <span>Generowanie…</span>
                )}
              </div>
              <strong>Zeskanuj kod QR</strong>
              <button className="small-link" onClick={copyCaptureLink}>
                {copied ? "✓ Link skopiowany" : "Skopiuj link zamiast QR"}
              </button>
              <button
                className="demo-return"
                onClick={() => loadSample("phone")}
              >
                Zasymuluj powrót zdjęć <span>→</span>
              </button>
              <small className="demo-note">
                Przycisk symulacyjny służy do prezentacji procesu na jednym
                ekranie.
              </small>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
