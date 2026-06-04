'use client';

import { motion } from 'framer-motion';

/**
 * App Router re-mounts template.tsx on every navigation, so this gives each
 * route a subtle enter animation without any manual orchestration. Kept gentle
 * (and disabled under prefers-reduced-motion via globals.css) so it feels
 * responsive, not sluggish, on low-end devices.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
