/**
 * Tool pages render directly inside the AppShell content pane — the sidebar now
 * handles navigation, so this layout just passes through.
 */
export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
