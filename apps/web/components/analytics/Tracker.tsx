'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { track } from '@/lib/track';

/** Records a page_view on every route change. Mounted once in the site layout. */
export function Tracker() {
  const pathname = usePathname();
  useEffect(() => {
    track('page_view', pathname);
  }, [pathname]);
  return null;
}
