// The warehouse drawing is this list. The screen only reads it.
// Hierarchy: Gudang → lorong (letter pairs) → blok → binlok (zero-padded row) → palet (A/B).
// A place is a spot on the floor. It is not the cardboard tag number.

export type FloorPlace = {
  id: string;
  gudang: number;
  aisle: string;
  row: number | null;
  side: "A" | "B" | null;
  label: string;
  /** Drawn as Tidak tersedia; excluded from assignable place labels. */
  unavailable?: boolean;
};

export type FloorAisle = {
  id: string;
  label: string;
  role: "outer" | "center";
};

export type FloorExtrasBand = {
  placement: "far" | "door";
  title: string;
  places: FloorPlace[];
};

export type Floor = {
  gudang: number;
  nama: string;
  note: string;
  aisles: FloorAisle[];
  rows: number[];
  places: FloorPlace[];
  extras: FloorExtrasBand[];
  /** Gudang Barang Rusak: no palette denah; assignable free-text slots only. */
  freeText?: boolean;
};

const SIDES = ["A", "B"] as const;

/** Default free-text slot count for Gudang 16. */
export const GUDANG_16_SLOTS = 10;

const TRANSIT_LABELS = [
  "Transit-1",
  "Transit-2-A",
  "Transit-2-B",
  "Transit-3",
  "Transit-4",
  "Transit-5-A",
  "Transit-5-B",
  "Transit-6-A",
  "Transit-6-B",
  "Transit-7",
  "Transit-8-A",
  "Transit-8-B",
  "Transit-9-A",
  "Transit-9-B",
  "Transit-10-A",
  "Transit-10-B",
  "Transit-11-A",
  "Transit-11-B",
  "Transit-12-A",
  "Transit-12-B",
  "Transit-13-A",
  "Transit-13-B",
  "Transit-14-A",
  "Transit-14-B",
  "Transit-15-A",
  "Transit-15-B",
  "Transit-16-A",
  "Transit-16-B",
  "Transit-17-A",
  "Transit-17-B",
  "Transit-18",
  "Transit-19",
  "Transit-20",
  "Transit-21",
  "Transit-22",
  "Transit-23",
  "Transit-24",
  "Transit-25",
] as const;

function padBinlok(row: number): string {
  return String(row).padStart(2, "0");
}

function rackRows(role: "outer" | "center", options?: { from?: number; to?: number; keepRow9?: boolean }) {
  const from = options?.from ?? 1;
  const to = options?.to ?? 19;
  const rows: number[] = [];
  for (let row = from; row <= to; row += 1) {
    if (row === 17) {
      continue;
    }
    if (role === "center" && row === 9 && !options?.keepRow9) {
      continue;
    }
    rows.push(row);
  }
  return rows;
}

function rackPlace(
  gudang: number,
  aisle: string,
  row: number,
  side: "A" | "B",
  options?: { unavailable?: boolean },
): FloorPlace {
  return {
    id: `${gudang}:${aisle}:${row}:${side}`,
    gudang,
    aisle,
    row,
    side,
    label: `${aisle}-${padBinlok(row)}-${side}`,
    unavailable: options?.unavailable || undefined,
  };
}

function namedPlace(gudang: number, aisle: string, label: string): FloorPlace {
  return { id: `${gudang}:${aisle}`, gudang, aisle, row: null, side: null, label };
}

function transitPlaces(gudang: number, labels: readonly string[]): FloorPlace[] {
  return labels.map((label) => namedPlace(gudang, label, label));
}

function transitSlice(from: number, count: number): string[] {
  return TRANSIT_LABELS.slice(from, from + count).map((label) => label);
}

function standardFloor(
  gudang: number,
  letters: [string, string, string, string],
  note: string,
  options?: { unavailableFrom?: number; transit?: string[] },
): Floor {
  const unavailableFrom = options?.unavailableFrom;
  const aisles: FloorAisle[] = letters.map((letter, index) => ({
    id: letter,
    label: letter,
    role: index === 0 || index === 3 ? "outer" : "center",
  }));
  const places = aisles.flatMap((aisle) =>
    rackRows(aisle.role).flatMap((row) =>
      SIDES.map((side) =>
        rackPlace(gudang, aisle.id, row, side, {
          unavailable: unavailableFrom != null && row >= unavailableFrom,
        }),
      ),
    ),
  );
  const extras: FloorExtrasBand[] = [];
  if (options?.transit?.length) {
    extras.push({
      placement: "door",
      title: "Area Transit Barang",
      places: transitPlaces(gudang, options.transit),
    });
  }
  return {
    gudang,
    nama: `Gudang ${gudang}`,
    note,
    aisles,
    rows: rackRows("outer"),
    places,
    extras,
  };
}

function gudang16(): Floor {
  return {
    gudang: 16,
    nama: "Gudang 16 · Barang Rusak",
    note: "Tanpa denah palet. Petugas mengisi lokasi bebas saat hitung.",
    aisles: [],
    rows: [],
    places: [],
    extras: [],
    freeText: true,
  };
}

function gudang21UvPlaces(): FloorPlace[] {
  // U kanan / kiri; U-07-A, U-07-B, U-09-A merge into Pretelan Barang Renovo.
  const uLabels = [
    "U-01-B",
    "U-02-B",
    "U-03-A",
    "U-03-B",
    "U-04-A",
    "U-04-B",
    "U-05-A",
    "U-05-B",
    "U-06-A",
    "U-06-B",
    "U-08-A",
    "U-08-B",
    "U-10-A",
  ];
  const uPlaces = uLabels.map((label) => namedPlace(21, label, label));
  const pretelan = namedPlace(21, "PRETELAN", "Pretelan Barang Renovo");
  const vOnlyA = new Set([13, 14, 27, 28]);
  const vPlaces: FloorPlace[] = [];
  for (let row = 1; row <= 28; row += 1) {
    const sides = vOnlyA.has(row) ? (["A"] as const) : SIDES;
    for (const side of sides) {
      vPlaces.push(rackPlace(21, "V", row, side));
    }
  }
  return [...uPlaces, pretelan, ...vPlaces];
}

function gudang21(): Floor {
  const aisles: FloorAisle[] = [
    { id: "Q", label: "Q", role: "outer" },
    { id: "R", label: "R", role: "center" },
    { id: "S", label: "S", role: "center" },
    { id: "T", label: "T", role: "outer" },
  ];
  const places: FloorPlace[] = [];
  for (const aisle of aisles) {
    const from = aisle.id === "Q" ? 6 : 7;
    const rows = rackRows(aisle.role, { from, keepRow9: true });
    for (const row of rows) {
      for (const side of SIDES) {
        places.push(
          rackPlace(21, aisle.id, row, side, {
            unavailable: row >= 18,
          }),
        );
      }
    }
  }
  return {
    gudang: 21,
    nama: "Gudang 21",
    note: "U dan V di lantai atas. Pretelan Barang Renovo menggantikan U-07-A/B dan U-09-A. Baris 18–19 ditandai tidak tersedia.",
    aisles,
    rows: rackRows("outer", { from: 6 }),
    places,
    extras: [
      {
        placement: "far",
        title: "Lantai atas · U, V, Pretelan",
        places: gudang21UvPlaces(),
      },
      {
        placement: "door",
        title: "Area Transit Barang",
        places: transitPlaces(21, transitSlice(10, 10)),
      },
    ],
  };
}

function gudang22(): Floor {
  const aisles: FloorAisle[] = [
    { id: "W", label: "W", role: "outer" },
    { id: "X", label: "X", role: "center" },
    { id: "Y", label: "Y", role: "center" },
    { id: "Z", label: "Z", role: "outer" },
  ];
  const places: FloorPlace[] = [];
  for (const aisle of aisles) {
    for (const row of rackRows(aisle.role, { to: 16 })) {
      const sides = row === 16 ? (["A"] as const) : SIDES;
      for (const side of sides) {
        places.push(rackPlace(22, aisle.id, row, side));
      }
    }
  }
  const gypsum = ["20-A", "19-B", "19-A", "18-B", "18-A"].map((label) => namedPlace(22, label, label));
  const transit = transitPlaces(22, transitSlice(0, 10));
  return {
    gudang: 22,
    nama: "Gudang 22",
    note: "Lorong W, X, Y, dan Z. Baris 16 hanya sisi A. Gypsum/triplek dan Area Transit di pintu.",
    aisles,
    rows: rackRows("outer", { to: 16 }),
    places,
    extras: [
      {
        placement: "door",
        title: "Gypsum, triplek, dan Area Transit Barang",
        places: [...gypsum, ...transit],
      },
    ],
  };
}

export const floors: Floor[] = [
  gudang16(),
  standardFloor(
    17,
    ["A", "B", "C", "D"],
    "Lorong A/B dan C/D. Binlok zero-padded (A-01-A). Lorong luar termasuk baris 9; tengah tanpa baris 9. Tidak ada baris 17.",
  ),
  standardFloor(18, ["E", "F", "G", "H"], "Pola yang sama dengan Gudang 17. Baris 18–19 ditandai tidak tersedia.", {
    unavailableFrom: 18,
  }),
  standardFloor(
    19,
    ["I", "J", "K", "L"],
    "Pola yang sama dengan Gudang 17. Baris 18–19 ditandai tidak tersedia. Area Transit di pintu.",
    { unavailableFrom: 18, transit: transitSlice(30, 8) },
  ),
  standardFloor(
    20,
    ["M", "N", "O", "P"],
    "Huruf lorong mengikuti urutan lembar. Baris 18–19 ditandai tidak tersedia. Area Transit di pintu.",
    { unavailableFrom: 18, transit: transitSlice(20, 10) },
  ),
  gudang21(),
  gudang22(),
];

export function floorByGudang(gudang: number): Floor | undefined {
  return floors.find((floor) => floor.gudang === gudang);
}

export function placeAt(floor: Floor, aisle: string, row: number): FloorPlace[] {
  return floor.places.filter((place) => place.aisle === aisle && place.row === row);
}

export function allFloorPlaces(floor: Floor): FloorPlace[] {
  return [...floor.places, ...floor.extras.flatMap((band) => band.places)];
}

/** Count of places that can be assigned (excludes unavailable blocks). */
export function activePlaceCount(floor: Floor): number {
  if (floor.freeText) {
    return GUDANG_16_SLOTS;
  }
  return allFloorPlaces(floor).filter((place) => !place.unavailable).length;
}

export function isFreeTextTagNomor(nomor: string): boolean {
  return /^G16-\d{2}$/.test(nomor);
}

export type FloorAisleRef = {
  gudang: number;
  gudangNama: string;
  aisle: string;
  label: string;
  placeLabels: string[];
};

function gudang16Slots(floor: Floor): FloorAisleRef[] {
  return Array.from({ length: GUDANG_16_SLOTS }, (_, index) => {
    const n = padBinlok(index + 1);
    return {
      gudang: floor.gudang,
      gudangNama: floor.nama,
      aisle: `S${n}`,
      label: `Slot ${n}`,
      placeLabels: [`G16-${n}`],
    };
  });
}

export function floorAisles(): FloorAisleRef[] {
  return floors.flatMap((floor) => {
    if (floor.freeText) {
      return gudang16Slots(floor);
    }
    const racks = floor.aisles.map((aisle) => ({
      gudang: floor.gudang,
      gudangNama: floor.nama,
      aisle: aisle.id,
      label: aisle.label,
      placeLabels: floor.places
        .filter((place) => place.aisle === aisle.id && !place.unavailable)
        .map((place) => place.label),
    }));
    const extrasByAisle = new Map<string, FloorAisleRef>();
    for (const band of floor.extras) {
      for (const place of band.places) {
        if (place.unavailable) {
          continue;
        }
        const current = extrasByAisle.get(place.aisle);
        if (current) {
          current.placeLabels.push(place.label);
          continue;
        }
        extrasByAisle.set(place.aisle, {
          gudang: floor.gudang,
          gudangNama: floor.nama,
          aisle: place.aisle,
          label: place.aisle === place.label ? place.label : place.aisle,
          placeLabels: [place.label],
        });
      }
    }
    return [...racks, ...extrasByAisle.values()];
  });
}

const placeLabels = new Set(floorAisles().flatMap((aisle) => aisle.placeLabels));

export function isFloorPlace(nomor: string): boolean {
  return placeLabels.has(nomor);
}
