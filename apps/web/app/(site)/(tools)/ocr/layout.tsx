import type { Metadata } from 'next';
import { pageMeta } from '@/lib/seo';
import { ToolSeoContent } from '@/components/seo/ToolSeoContent';

export const metadata: Metadata = pageMeta('/ocr');

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ToolSeoContent path="/ocr" />
    </>
  );
}
