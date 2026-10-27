-- The four portal sections (wave 2), seeded empty and unpublished: an admin
-- writes and publishes them in the section editor. Never edit this file once
-- shipped; ON CONFLICT DO NOTHING keeps any row that already exists as it is.

INSERT INTO investors.sections (slug, title, body_md, sort_order, published) VALUES
  ('overview', 'Overview', '', 1, false),
  ('team', 'Team', '', 2, false),
  ('faq', 'FAQ', '', 3, false),
  ('contact', 'Contact', '', 4, false)
ON CONFLICT DO NOTHING;
