-- Daily Special Spanish translation (docs/08's proposed design, now built):
-- a second, owner-reviewed rendered artifact alongside the English one.
-- special_data_es holds a translated DailySpecialMenu (src/lib/menu/special-menu-schema.ts,
-- no themeId wrapper — the theme is shared with the English render, see
-- special_data). generated_image_path_es is the Spanish .svg in the same
-- public site-media bucket as generated_image_path. Both null until the
-- owner uses "Translate to Spanish" on the Review screen and saves.
--
-- No provider_task_config constraint change needed here — this reuses the
-- translate_menu task added for Main Menu translation
-- (20260706000025_main_menu_translations.sql).
alter table menus
  add column special_data_es jsonb,
  add column generated_image_path_es text;
