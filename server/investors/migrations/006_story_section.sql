-- The story section, seeded empty and unpublished: the Story page that only
-- signed-in investors read, at /investors/story. An admin writes and
-- publishes it in the section editor, with no deploy; its sidebar link shows
-- only once it is published. Never edit this file once shipped;
-- ON CONFLICT DO NOTHING keeps any row that already exists as it is.
--
-- Why sort_order 6: sort_order is an integer and contact (4) and
-- founder_card (5) leave no number between them, so the row goes last in the
-- admin list. The sidebar's order is the app's (PAGE_SECTIONS), not this one.
-- 003 and 004 stay reserved for PRD-002's review mode; migrate.js allows the
-- gap.

INSERT INTO investors.sections (slug, title, body_md, sort_order, published) VALUES
  ('story', 'Story', '', 6, false)
ON CONFLICT DO NOTHING;
