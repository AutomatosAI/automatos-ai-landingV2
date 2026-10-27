-- Investor portal schema, version 1. Applied by server/investors/migrate.js in
-- one transaction; never edit this file once shipped: add 002_*.sql instead.
-- Every foreign key to investors.id cascades, so deleting an investor removes
-- all their data.

CREATE TABLE investors.investors (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id        text NOT NULL UNIQUE,
  email                text NOT NULL,
  name                 text,
  firm                 text,
  title                text,
  investor_type        text CHECK (investor_type IN ('vc', 'angel', 'family_office', 'corporate', 'accelerator', 'other')),
  linkedin_url         text,
  cheque_size          text CHECK (cheque_size IN ('lt_50k', '50k_250k', '250k_1m', 'gt_1m')),
  country              text,
  source               text CHECK (source IN ('websummit', 'intro', 'website', 'other')),
  marketing_opt_in     boolean NOT NULL DEFAULT false,
  marketing_opt_in_at  timestamptz,
  profile_completed_at timestamptz,
  blocked              boolean NOT NULL DEFAULT false,
  created_at           timestamptz NOT NULL DEFAULT now(),
  last_seen_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE investors.documents (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title               text NOT NULL,
  description         text,
  category            text,
  kind                text NOT NULL CHECK (kind IN ('pdf', 'video', 'spreadsheet', 'slides', 'doc', 'other')),
  s3_key              text,
  file_name           text,
  content_type        text,
  size_bytes          bigint,
  page_count          integer,
  version             integer NOT NULL DEFAULT 1,
  sort_order          integer NOT NULL DEFAULT 0,
  published           boolean NOT NULL DEFAULT false,
  alert_on_first_open boolean NOT NULL DEFAULT false,
  created_by          text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Admin-edited markdown pages (wave 2 fills and serves them).
CREATE TABLE investors.sections (
  slug       text PRIMARY KEY,
  title      text NOT NULL,
  body_md    text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  published  boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text
);

-- One per visit. No IP addresses are stored.
CREATE TABLE investors.sessions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id       uuid NOT NULL REFERENCES investors.investors (id) ON DELETE CASCADE,
  started_at        timestamptz NOT NULL DEFAULT now(),
  last_heartbeat_at timestamptz NOT NULL DEFAULT now(),
  user_agent        text
);

CREATE TABLE investors.events (
  id               bigserial PRIMARY KEY,
  investor_id      uuid NOT NULL REFERENCES investors.investors (id) ON DELETE CASCADE,
  session_id       uuid REFERENCES investors.sessions (id) ON DELETE SET NULL,
  type             text NOT NULL CHECK (type IN ('signed_in', 'profile_completed', 'section_view', 'document_open',
                                                 'document_download', 'page_view', 'video_progress')),
  document_id      uuid REFERENCES investors.documents (id) ON DELETE SET NULL,
  document_version integer,
  page             integer,
  duration_ms      integer CHECK (duration_ms BETWEEN 0 AND 600000),
  data             jsonb,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- One row per alert sent, so an alert never repeats. A deleted document takes
-- its first-open rows with it: SET NULL would make two of them collide below.
CREATE TABLE investors.alerts_sent (
  investor_id uuid NOT NULL REFERENCES investors.investors (id) ON DELETE CASCADE,
  kind        text NOT NULL CHECK (kind IN ('signup', 'first_open')),
  document_id uuid REFERENCES investors.documents (id) ON DELETE CASCADE,
  sent_at     timestamptz NOT NULL DEFAULT now()
);

-- UNIQUE (investor_id, kind, document_id) with NULL document_id counted as
-- equal, so a sign-up alert is recorded once (INSERT ... ON CONFLICT DO NOTHING).
CREATE UNIQUE INDEX alerts_sent_once_idx ON investors.alerts_sent
  (investor_id, kind, COALESCE(document_id, '00000000-0000-0000-0000-000000000000'::uuid));

CREATE INDEX events_investor_created_idx ON investors.events (investor_id, created_at DESC);
CREATE INDEX events_document_type_idx ON investors.events (document_id, type);
CREATE INDEX events_type_created_idx ON investors.events (type, created_at DESC);

-- Foreign-key indexes: deleting an investor cascades through these.
CREATE INDEX sessions_investor_idx ON investors.sessions (investor_id, started_at DESC);
CREATE INDEX events_session_idx ON investors.events (session_id);
