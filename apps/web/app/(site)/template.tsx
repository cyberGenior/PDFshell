/**
 * App Router re-mounts template.tsx on every navigation, giving each route a
 * subtle enter animation. Done with a CSS class (see .route-enter in globals.css)
 * instead of framer-motion, so this hot path ships zero JS and stays smooth on
 * low-end devices. Respects prefers-reduced-motion via globals.css.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="route-enter">{children}</div>;
}
