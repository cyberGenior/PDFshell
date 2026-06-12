import { AppShell } from '@/components/shell/AppShell';
import { Tracker } from '@/components/analytics/Tracker';
import { AdPopup } from '@/components/ads/AdPopup';
import { SiteFooter } from '@/components/seo/SiteFooter';

/** Public-facing app chrome (sidebar + topbar) for the PDF tools and landing. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Tracker />
      <AppShell footer={<SiteFooter />}>{children}</AppShell>
      <AdPopup />
    </>
  );
}
