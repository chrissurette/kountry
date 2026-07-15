/**
 * Next.js remounts `template.tsx` on every navigation (unlike `layout.tsx`,
 * which persists) — so this is the standard place to hang a per-page-enter
 * transition without touching the nav/footer in layout.tsx, which never
 * re-renders or flashes. Pure CSS (`.animate-page-in`, globals.css): no JS,
 * no client component, the animation just replays because this is a fresh
 * DOM node each time.
 */
export default function MarketingTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-page-in">{children}</div>;
}
