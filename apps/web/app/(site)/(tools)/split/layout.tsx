import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta('/split');

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
