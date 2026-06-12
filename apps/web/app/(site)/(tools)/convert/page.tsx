import { ToolShell } from '@/components/pdf/ToolShell';
import { ConvertHubGrid } from '@/components/convert/ConvertHubGrid';
import { ToolSeoContent } from '@/components/seo/ToolSeoContent';

/**
 * Server component so the hub's SEO content renders ONLY here (not on the convert
 * sub-pages, which share convert/layout.tsx). The interactive card grid is a
 * client island; the SEO block stays server-rendered HTML.
 */
export default function ConvertHub() {
  return (
    <>
      <ToolShell slug="convert">
        <ConvertHubGrid />
      </ToolShell>
      <ToolSeoContent path="/convert" />
    </>
  );
}
