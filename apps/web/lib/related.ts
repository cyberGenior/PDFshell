import { TOOLS, type ToolMeta } from './tools';
import { CONVERSIONS, type Conversion } from './conversions';
import { GUIDES, type Guide } from './guides';

/**
 * Loose grouping used only to ORDER related-tool suggestions (same-category
 * first, then fill). Kept here rather than on ToolMeta so the tool registry stays
 * about identity, not cross-linking; this is the only consumer.
 */
type Category = 'organize' | 'pages' | 'edit' | 'scan' | 'optimize' | 'secure' | 'convert';
const CATEGORY: Record<string, Category> = {
  merge: 'organize', split: 'organize',
  rotate: 'pages', 'page-numbers': 'pages', watermark: 'pages', crop: 'pages',
  edit: 'edit', scan: 'scan', ocr: 'scan',
  compress: 'optimize', protect: 'secure', convert: 'convert',
};

/** Up to `limit` related tools: same category first, then other ready tools. */
export function relatedTools(slug: string, limit = 4): ToolMeta[] {
  const ready = TOOLS.filter((t) => t.ready && t.slug !== slug);
  const cat = CATEGORY[slug];
  const same = cat ? ready.filter((t) => CATEGORY[t.slug] === cat) : [];
  const rest = ready.filter((t) => !same.includes(t));
  return [...same, ...rest].slice(0, limit);
}

/** Other conversions, for cross-linking within the /convert family. */
export function siblingConversions(slug: string, limit = 4): Conversion[] {
  return CONVERSIONS.filter((c) => c.ready && c.slug !== slug).slice(0, limit);
}

/** Guides that point at this tool path — the tool→guide reciprocal links. */
export function relatedGuides(path: string, limit = 3): Guide[] {
  return GUIDES.filter((g) => g.tool.href === path).slice(0, limit);
}
