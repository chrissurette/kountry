-- Daily Specials pipeline change (2026-07-15, owner's explicit call): the
-- published Daily Special is now an AI-*generated* image (a styled redraw
-- of the handwritten photo), not AI-OCR'd structured text. menu_sections/
-- menu_items stay in the schema (harmless if empty) but new Daily Specials
-- populate this column instead. Path lives in the public `site-media`
-- bucket (same one Site Photos uses) — public read is required since
-- anonymous visitors view this on the homepage/menu page, and public URLs
-- don't expire the way private-bucket signed URLs do.
alter table menus
  add column generated_image_path text;
