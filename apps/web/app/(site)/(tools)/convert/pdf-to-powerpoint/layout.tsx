import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta('/convert/pdf-to-powerpoint');

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
