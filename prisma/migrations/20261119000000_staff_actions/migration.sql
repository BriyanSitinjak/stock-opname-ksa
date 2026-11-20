CREATE SEQUENCE staff_actions_id_seq;

CREATE TABLE staff_actions (
  id         text PRIMARY KEY DEFAULT ('log-' || nextval('staff_actions_id_seq')),
  actor_id   text NOT NULL REFERENCES users (id),
  action     text NOT NULL,
  summary    text NOT NULL,
  session_id text REFERENCES opname_sessions (id),
  created_at timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT staff_actions_id_prefix CHECK (id ~ '^log-[1-9][0-9]*$'),
  CONSTRAINT staff_actions_actor_id_prefix CHECK (actor_id ~ '^usr-[1-9][0-9]*$'),
  CONSTRAINT staff_actions_session_id_prefix CHECK (session_id IS NULL OR session_id ~ '^ses-[1-9][0-9]*$')
);

ALTER SEQUENCE staff_actions_id_seq OWNED BY staff_actions.id;

CREATE INDEX staff_actions_created_at_idx ON staff_actions (created_at);
