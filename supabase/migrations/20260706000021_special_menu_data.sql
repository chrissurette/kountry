-- Structured Daily Special data (2026-07-16 refactor, docs/08's text-garbling
-- resolution): the pipeline moved from "send the photo to gpt-image-1 and let
-- it hand-letter the whole menu" to "extract structured JSON with a vision
-- model, let the owner edit it, then render the menu deterministically as SVG
-- in app code." special_data holds the owner-editable structured menu plus the
-- chosen theme id, so a published special can be re-rendered without re-calling
-- the AI. generated_image_path continues to hold the rendered artifact's
-- storage path (now an .svg, previously a gpt-image-1 .png) — old PNG-based
-- snapshots keep working untouched.
alter table menus add column special_data jsonb;
