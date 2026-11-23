// The warehouse drawing is this list. The screen only reads it.
// A place is a spot on the floor (aisle, row, side). It is not the cardboard
// tag number. That number is typed during the count.

export type FloorPlace = {
  id: string;
  gudang: number;
  aisle: string;
  row: number | null;
  side: "A" | "B" | null;
  label: string;
};

export type FloorAisle = {
  id: string;
  label: string;
  role: "outer" | "center";
};

export type Floor = {
  gudang: number;
  nama: string;
  note: string;
  aisles: FloorAisle[];
  rows: number[];
  places: FloorPlace[];
  extras: { placement: "far" | "door"; title: string; places: FloorPlace[] };
};

const SIDES = ["A", "B"] as const;

function rackRows(role: "outer" | "center", options?: { from?: number; to?: number; keepRow9?: boolean; through?: number }) {
  const from = options?.from ?? 1;
  const to = options?.to ?? options?.through ?? 19;
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

function rackPlace(gudang: number, aisle: string, row: number, side: "A" | "B"): FloorPlace {
  return {
    id: `${gudang}:${aisle}:${row}:${side}`,
    gudang,
    aisle,
    row,
    side,
    label: `${aisle}-${row}-${side}`,
  };
}

function namedPlace(gudang: number, aisle: string, label: string): FloorPlace {
  return { id: `${gudang}:${aisle}`, gudang, aisle, row: null, side: null, label };
}

function standardFloor(gudang: number, letters: [string, string, string, string], note: string): Floor {
  const aisles: FloorAisle[] = letters.map((letter, index) => ({
    id: letter,
    label: letter,
    role: index === 0 || index === 3 ? "outer" : "center",
  }));
  const places = aisles.flatMap((aisle) =>
    rackRows(aisle.role).flatMap((row) => SIDES.map((side) => rackPlace(gudang, aisle.id, row, side))),
  );
  return {
    gudang,
    nama: `Gudang ${gudang}`,
    note,
    aisles,
    rows: rackRows("outer"),
    places,
    extras: { placement: "door", title: "", places: [] },
  };
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
        places.push(rackPlace(21, aisle.id, row, side));
      }
    }
  }
  return {
    gudang: 21,
    nama: "Gudang 21",
    note: "U dan V masing-masing satu tempat. Ruang arsip dan tangga tidak dihitung. Baris 12 ke atas mengikuti pola lembar yang sama, karena foto berhenti di baris 11.",
    aisles,
    rows: rackRows("outer", { from: 6 }),
    places,
    extras: {
      placement: "far",
      title: "Lantai atas",
      places: [
        namedPlace(21, "V", "V"),
        namedPlace(21, "U", "U"),
      ],
    },
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
  return {
    gudang: 22,
    nama: "Gudang 22",
    note: "Lorong W, X, Y, dan Z. Baris 16 hanya sisi A. Lima petak gypsum memakai nama yang tertulis.",
    aisles,
    rows: rackRows("outer", { to: 16 }),
    places,
    extras: { placement: "door", title: "Area gypsum dan triplek", places: gypsum },
  };
}

export const floors: Floor[] = [
  standardFloor(17, ["A", "B", "C", "D"], "Lorong A dan D di rak pinggir, termasuk baris 9. Lorong B dan C di rak tengah, tanpa baris 9. Tidak ada baris 17."),
  standardFloor(18, ["E", "F", "G", "H"], "Pola yang sama dengan Gudang 17."),
  standardFloor(19, ["I", "J", "K", "L"], "Pola yang sama dengan Gudang 17. Cat di lantai, misalnya J-16-A, adalah lorong, baris, lalu sisi."),
  standardFloor(
    20,
    ["M", "N", "O", "P"],
    "Huruf lorong mengikuti urutan lembar, di antara L pada Gudang 19 dan Q pada Gudang 21.",
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

export type FloorAisleRef = {
  gudang: number;
  gudangNama: string;
  aisle: string;
  label: string;
  placeLabels: string[];
};

export function floorAisles(): FloorAisleRef[] {
  return floors.flatMap((floor) => {
    const racks = floor.aisles.map((aisle) => ({
      gudang: floor.gudang,
      gudangNama: floor.nama,
      aisle: aisle.id,
      label: aisle.label,
      placeLabels: floor.places.filter((place) => place.aisle === aisle.id).map((place) => place.label),
    }));
    const extras = floor.extras.places.map((place) => ({
      gudang: floor.gudang,
      gudangNama: floor.nama,
      aisle: place.aisle,
      label: place.label,
      placeLabels: [place.label],
    }));
    return [...racks, ...extras];
  });
}

const placeLabels = new Set(floorAisles().flatMap((aisle) => aisle.placeLabels));

export function isFloorPlace(nomor: string): boolean {
  return placeLabels.has(nomor);
}
