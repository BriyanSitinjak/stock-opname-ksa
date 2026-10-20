-- stock-opname, initial schema
-- 13 tables. Read 03-data-model.md before changing anything here.

CREATE TYPE "Role"          AS ENUM ('admin', 'reviewer', 'counter');
CREATE TYPE "SessionStatus" AS ENUM ('draft', 'open', 'counting', 'review', 'approved', 'closed');
CREATE TYPE "Kondisi"       AS ENUM ('baik', 'rusak', 'kadaluarsa');

-- ---------------------------------------------------------------- master data

CREATE TABLE "users" (
  "id"            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "nama"          text NOT NULL,
  "username"      text UNIQUE,
  "password_hash" text,                      -- NULL for every counter, deliberately
  "role"          "Role" NOT NULL,
  "retired_at"    timestamptz
);

CREATE TABLE "gudang" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "kode"       text NOT NULL UNIQUE,
  "nama"       text NOT NULL,                -- must equal Nama_Gudang in the export, byte for byte
  "urutan"     int  NOT NULL DEFAULT 0,
  "retired_at" timestamptz
);

CREATE TABLE "lokasi" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "gudang_id"  uuid NOT NULL REFERENCES "gudang"("id"),
  "nama"       text NOT NULL,
  "urutan"     int  NOT NULL DEFAULT 0,
  "retired_at" timestamptz,
  UNIQUE ("gudang_id", "nama")
);

CREATE TABLE "tags" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "lokasi_id"  uuid NOT NULL REFERENCES "lokasi"("id"),
  "nomor"      text NOT NULL,
  "weight"     int  NOT NULL DEFAULT 1,      -- 3 besar, 2 sedang, 1 kecil
  "urutan"     int  NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "retired_at" timestamptz,
  UNIQUE ("lokasi_id", "nomor")
);

-- ------------------------------------------------------------------- sessions

CREATE TABLE "opname_sessions" (
  "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "nama"         text NOT NULL,
  "periode"      text NOT NULL,
  "snapshot_at"  timestamptz NOT NULL,
  "scope_filter" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "source_query" text,
  "status"       "SessionStatus" NOT NULL DEFAULT 'draft',
  "created_by"   uuid REFERENCES "users"("id"),
  "created_at"   timestamptz NOT NULL DEFAULT now()
);

-- The per session pin. Written once at draft -> open, never updated.
CREATE TABLE "session_tags" (
  "session_id"  uuid NOT NULL REFERENCES "opname_sessions"("id"),
  "tag_id"      uuid NOT NULL REFERENCES "tags"("id"),
  "nomor"       text NOT NULL,
  "lokasi_nama" text NOT NULL,
  "gudang_nama" text NOT NULL,
  "weight"      int  NOT NULL,
  "urutan"      int  NOT NULL,
  PRIMARY KEY ("session_id", "tag_id")
);

-- ------------------------------------------------------------------- snapshot

CREATE TABLE "import_rows" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "session_id" uuid NOT NULL REFERENCES "opname_sessions"("id"),
  "row_number" int  NOT NULL,
  "raw"        jsonb NOT NULL,               -- every column as text, nothing coerced
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "snapshot_items" (
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "session_id"       uuid NOT NULL REFERENCES "opname_sessions"("id"),
  "gudang_id"        uuid NOT NULL REFERENCES "gudang"("id"),
  "kode_barang"      text NOT NULL,
  "barcode_4"        text,                   -- text, never int, or 0123 loses its zero
  "nama_barang"      text NOT NULL,
  "kode_brand"       text,
  "nama_brand"       text,
  "kode_group"       text,
  "nama_group"       text,
  "uom"              text,
  "qty_onhand"       numeric(18,4) NOT NULL, -- NEVER sent to a phone
  "harga_satuan"     numeric(18,2),          -- NEVER sent to a phone. Copied, not looked up later
  "source_row_count" int NOT NULL DEFAULT 1,
  UNIQUE ("session_id", "gudang_id", "kode_barang")
);
-- Total_Harga is deliberately absent. It is qty x harga_satuan, derived on read.

-- ------------------------------------------------------------------- counting

CREATE TABLE "tag_assignments" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "session_id"  uuid NOT NULL REFERENCES "opname_sessions"("id"),
  "tag_id"      uuid NOT NULL REFERENCES "tags"("id"),
  "pass"        smallint NOT NULL CHECK ("pass" IN (1,2,3)),
  "user_id"     uuid NOT NULL REFERENCES "users"("id"),
  "assigned_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("session_id", "tag_id", "pass")
);

-- APPEND ONLY. No UPDATE, no DELETE, ever. A correction is a new row.
CREATE TABLE "counts" (
  "id"                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "client_row_id"     uuid NOT NULL UNIQUE,  -- generated on the device. The idempotency key
  "session_id"        uuid NOT NULL REFERENCES "opname_sessions"("id"),
  "tag_id"            uuid NOT NULL REFERENCES "tags"("id"),
  "pass"              smallint NOT NULL CHECK ("pass" IN (1,2,3)),
  "snapshot_item_id"  uuid NOT NULL REFERENCES "snapshot_items"("id"),
  "counted_by"        uuid NOT NULL REFERENCES "users"("id"),
  "qty"               numeric(18,4) NOT NULL CHECK ("qty" >= 0),
  "qty_note"          text,                  -- the calculator expression, e.g. 12 x 24 + 6
  "kondisi"           "Kondisi" NOT NULL,
  "device_id"         text NOT NULL,         -- load bearing, the device pair rule reads this
  "client_created_at" timestamptz NOT NULL,  -- ordering key
  "server_created_at" timestamptz NOT NULL DEFAULT now()
);

-- APPEND ONLY.
CREATE TABLE "tag_submissions" (
  "id"                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "client_row_id"     uuid NOT NULL UNIQUE,
  "session_id"        uuid NOT NULL REFERENCES "opname_sessions"("id"),
  "tag_id"            uuid NOT NULL REFERENCES "tags"("id"),
  "pass"              smallint NOT NULL CHECK ("pass" IN (1,2,3)),
  "submitted_by"      uuid NOT NULL REFERENCES "users"("id"),
  "is_empty"          boolean NOT NULL DEFAULT false,
  "device_id"         text NOT NULL,
  "client_created_at" timestamptz NOT NULL,
  "server_created_at" timestamptz NOT NULL DEFAULT now()
);

-- APPEND ONLY. Separate table so a nullable FK can never contaminate variance.
CREATE TABLE "unknown_items" (
  "id"                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "client_row_id"     uuid NOT NULL UNIQUE,
  "session_id"        uuid NOT NULL REFERENCES "opname_sessions"("id"),
  "tag_id"            uuid NOT NULL REFERENCES "tags"("id"),
  "pass"              smallint NOT NULL CHECK ("pass" IN (1,2,3)),
  "counted_by"        uuid NOT NULL REFERENCES "users"("id"),
  "device_id"         text NOT NULL,
  "kode_input"        text,
  "nama_input"        text,
  "qty"               numeric(18,4) NOT NULL CHECK ("qty" >= 0),
  "kondisi"           "Kondisi" NOT NULL,
  "client_created_at" timestamptz NOT NULL,
  "server_created_at" timestamptz NOT NULL DEFAULT now()
);

-- This table replaced the password.
CREATE TABLE "user_devices" (
  "session_id"            uuid NOT NULL REFERENCES "opname_sessions"("id"),
  "device_id"             text NOT NULL,
  "user_id"               uuid NOT NULL REFERENCES "users"("id"),
  "bound_at"              timestamptz NOT NULL DEFAULT now(),
  "bound_by"              uuid REFERENCES "users"("id"),
  "released_at"           timestamptz,
  "last_sync_at"          timestamptz,
  "last_reported_pending" int NOT NULL DEFAULT 0,
  PRIMARY KEY ("session_id", "device_id")
);

CREATE TABLE "approvals" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "session_id"  uuid NOT NULL REFERENCES "opname_sessions"("id"),
  "step"        smallint NOT NULL CHECK ("step" IN (1,2)),
  "approved_by" uuid NOT NULL REFERENCES "users"("id"),
  "approved_at" timestamptz NOT NULL DEFAULT now(),
  "catatan"     text,
  UNIQUE ("session_id", "step")
);

-- -------------------------------------------------------------------- indexes

CREATE INDEX "counts_session_tag_pass_idx"  ON "counts" ("session_id", "tag_id", "pass");
CREATE INDEX "snapshot_items_barcode_idx"   ON "snapshot_items" ("session_id", "barcode_4");
CREATE INDEX "session_tags_render_idx"      ON "session_tags" ("session_id", "gudang_nama", "lokasi_nama", "urutan");

-- Enforces a rule rather than speeding a query: one live phone per counter.
CREATE UNIQUE INDEX "user_devices_one_live_per_user"
  ON "user_devices" ("session_id", "user_id")
  WHERE "released_at" IS NULL;
