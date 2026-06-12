import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';

export const metadata: Metadata = pageMeta('/convert');

// NOTE: this layout wraps BOTH the hub (/convert) and every sub-page
// (/convert/pdf-to-word, …), so it must NOT render the hub's ToolSeoContent —
// that would duplicate the hub content onto every sub-page. The hub renders its
// own SEO block in page.tsx; each sub-page renders its own via its own layout.
export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
