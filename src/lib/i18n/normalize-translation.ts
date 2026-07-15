/**
 * Repairs a specific, observed translation-model artifact: a standalone
 * Spanish conjunction (y/e = "and", o/u = "or") glued onto the following
 * capitalized word — seen live as "Pollo yÑoquis" for "Chicken & Dumplings"
 * (gpt-4o-mini dropped the space before the accented capital Ñ). Applied to
 * every translated string in both translation pipelines (Daily Special +
 * Main Menu) before results reach the owner.
 *
 * Deliberately narrow: only a single-letter conjunction with a word boundary
 * before it, immediately followed by a capital (incl. accented capitals).
 * That shape is near-certainly the artifact; broader lowercase→uppercase
 * splitting would mangle legitimate mixed-case names ("McRib").
 */
export function fixConjunctionSpacing(text: string): string {
  return text.replace(/\b([yeou])([A-ZÁÉÍÓÚÑÜ])/g, "$1 $2");
}
