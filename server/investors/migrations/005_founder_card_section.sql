-- The founder_card section (PRD-003 US-305), seeded empty and unpublished:
-- rows that only signed-in investors see in Home's founder card, one per line
-- as "- [shown text](address) label". An admin fills and publishes it in the
-- section editor, with no deploy. Never edit this file once shipped;
-- ON CONFLICT DO NOTHING keeps any row that already exists as it is.
--
-- Why 005: PRD-002 reserves 003 (review mode) and 004 (reviews). migrate.js
-- allows a gap, and this seed depends on neither, so their order on
-- production does not matter.

INSERT INTO investors.sections (slug, title, body_md, sort_order, published) VALUES
  ('founder_card', 'Founder card', '', 5, false)
ON CONFLICT DO NOTHING;
