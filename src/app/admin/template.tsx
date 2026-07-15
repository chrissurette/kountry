/**
 * Mirrors src/app/(marketing)/template.tsx: Next.js remounts `template.tsx`
 * on every navigation while `layout.tsx` (AdminNav) persists untouched, so
 * this gives every admin screen the same quick fade-in without the nav ever
 * re-rendering or flashing.
 */
export default function AdminTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-page-in">{children}</div>;
}
