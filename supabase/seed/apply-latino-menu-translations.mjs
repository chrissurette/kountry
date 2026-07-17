// Re-applies the hand-curated Latino Spanish menu translation (2026-07-16)
// from latino-menu-translations.mjs. Run from repo root: node supabase/seed/apply-latino-menu-translations.mjs
// NOTE: keyed by row UUIDs — valid only while the current main_menu rows exist.
// After any replace_main_menu reinsert the ids change; re-key by name first.
import { createRequire } from "module";
import { readFileSync } from "fs";
import { SECTIONS, ITEMS } from "./latino-menu-translations.mjs";
const require = createRequire("C:/Users/rcman/OneDrive/Desktop/mymenuagent/package.json");
const { createClient } = require("@supabase/supabase-js");
const envText = readFileSync("C:/Users/rcman/OneDrive/Desktop/mymenuagent/.env.local", "utf8");
const env = Object.fromEntries(envText.split(/\r?\n/).filter(l => l.includes("=") && !l.startsWith("#")).map(l => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]));
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

// Per-id UPDATEs only — never replace_main_menu (delete-then-reinsert, no
// backups). Every guard runs BEFORE the first write; any failure aborts the
// whole batch untouched.
const count = async (t) => (await admin.from(t).select("*", { count: "exact", head: true })).count;
const before = { sections: await count("main_menu_sections"), items: await count("main_menu_items") };

const { data: dbSecs } = await admin.from("main_menu_sections").select("id, name, description");
const { data: dbItems } = await admin.from("main_menu_items").select("id, name, description");

const problems = [];
// 1. Total coverage both directions: every DB row translated, no orphan ids.
for (const s of dbSecs) if (!SECTIONS[s.id]) problems.push(`DB section not covered: ${s.name} (${s.id})`);
for (const i of dbItems) if (!ITEMS[i.id]) problems.push(`DB item not covered: ${i.name} (${i.id})`);
for (const id of Object.keys(SECTIONS)) if (!dbSecs.some((s) => s.id === id)) problems.push(`Orphan section id in map: ${id}`);
for (const id of Object.keys(ITEMS)) if (!dbItems.some((i) => i.id === id)) problems.push(`Orphan item id in map: ${id}`);

// 2. Every EN description must have an ES description in the map (else the
//    public page silently falls back to English mid-menu), and vice versa.
// 3. Chip separators (" · ") and price tokens must match the EN source
//    exactly, in order — a translated description may never change what the
//    chips render or what anything costs.
const prices = (s) => (s.match(/\+?\$\d+(?:\.\d{2})?|\d+¢/g) ?? []).join("|");
const mids = (s) => (s.match(/ · /g) ?? []).length;
const checkDesc = (kind, row, map) => {
  const t = map[row.id];
  if (row.description && !t.description_es) problems.push(`${kind} "${row.name}": EN desc but no ES desc`);
  if (!row.description && t.description_es) problems.push(`${kind} "${row.name}": ES desc but no EN desc`);
  if (row.description && t.description_es) {
    if (mids(row.description) !== mids(t.description_es)) problems.push(`${kind} "${row.name}": chip count ${mids(row.description)} EN vs ${mids(t.description_es)} ES`);
    if (prices(row.description) !== prices(t.description_es)) problems.push(`${kind} "${row.name}": price tokens differ\n  EN ${prices(row.description)}\n  ES ${prices(t.description_es)}`);
  }
  if (!t.name_es) problems.push(`${kind} "${row.name}": missing name_es`);
};
for (const s of dbSecs) if (SECTIONS[s.id]) checkDesc("section", s, SECTIONS);
for (const i of dbItems) if (ITEMS[i.id]) checkDesc("item", i, ITEMS);

if (problems.length) { console.error("ABORT — nothing written:\n" + problems.join("\n")); process.exit(1); }

// All guards green — write.
let written = 0;
for (const [id, t] of Object.entries(SECTIONS)) {
  const patch = { name_es: t.name_es, ...(t.description_es !== undefined ? { description_es: t.description_es } : {}) };
  const { error } = await admin.from("main_menu_sections").update(patch).eq("id", id);
  if (error) { console.error(`FAILED section ${id}: ${error.message}`); process.exit(1); }
  written++;
}
for (const [id, t] of Object.entries(ITEMS)) {
  const patch = { name_es: t.name_es, ...(t.description_es !== undefined ? { description_es: t.description_es } : {}) };
  const { error } = await admin.from("main_menu_items").update(patch).eq("id", id);
  if (error) { console.error(`FAILED item ${id}: ${error.message}`); process.exit(1); }
  written++;
}

const after = { sections: await count("main_menu_sections"), items: await count("main_menu_items") };

// Residual scan: none of the audited-out terms may survive anywhere in ES.
const BAD = /sémola|gofre|galleta|bizcocho|\btocino\b|judías|betabel|cacahuate|durazno|\bSoco\b|a tu estilo|estrellado|Islandés|recargas|cuenco|lonchas|beicon|en conserva|papas de casa|Ordenes Lado|Corte corto|Chops de|Tazón|\bañad|elección/i;
let residue = 0;
for (const table of ["main_menu_sections", "main_menu_items"]) {
  const { data } = await admin.from(table).select("id, name, name_es, description_es");
  for (const r of data ?? []) {
    for (const f of ["name_es", "description_es"]) {
      if (r[f] && BAD.test(r[f])) { console.error(`RESIDUE ${table} "${r.name}" .${f}: ${r[f].slice(0, 140)}`); residue++; }
    }
  }
}

console.log(JSON.stringify({ before, after, countsUnchanged: before.sections === after.sections && before.items === after.items, rowsWritten: written, residue }));
if (residue || before.items !== after.items || before.sections !== after.sections) process.exit(1);
