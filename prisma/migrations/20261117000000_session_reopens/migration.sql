CREATE TABLE "session_reopens" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "session_id"  uuid NOT NULL REFERENCES "opname_sessions"("id"),
  "reason"      text NOT NULL,
  "reopened_by" uuid NOT NULL REFERENCES "users"("id"),
  "reopened_at" timestamptz NOT NULL DEFAULT now()
);
