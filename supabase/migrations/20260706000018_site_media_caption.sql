-- Optional caption/label per site_media row (hero or gallery), editable by
-- staff at /admin/site and shown publicly on the Gallery page when set.
alter table site_media add column caption text;
