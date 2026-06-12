import { getTool } from './tools';
import { getConversion } from './conversions';
import { getGuide } from './guides';

export interface Crumb {
  name: string;
  url: string;
}

/**
 * Build a breadcrumb trail (root → current page) for a path, with labels pulled
 * from the same sources of truth the pages use — so the visible trail and the
 * BreadcrumbList schema always match. Returns [] for the homepage and for any
 * path we don't recognise (the caller renders nothing).
 */
export function buildBreadcrumbs(path: string): Crumb[] {
  if (!path || path === '/') return [];
  const home: Crumb = { name: 'Home', url: '/' };

  // Guides
  if (path === '/guides') return [home, { name: 'Guides', url: '/guides' }];
  if (path.startsWith('/guides/')) {
    const slug = path.slice('/guides/'.length);
    const g = getGuide(slug);
    if (!g) return [];
    return [home, { name: 'Guides', url: '/guides' }, { name: g.title, url: path }];
  }

  // Convert hub + sub-conversions
  if (path === '/convert') return [home, { name: 'Convert PDF', url: '/convert' }];
  if (path.startsWith('/convert/')) {
    const slug = path.slice('/convert/'.length);
    const c = getConversion(slug);
    if (!c) return [];
    return [home, { name: 'Convert PDF', url: '/convert' }, { name: c.title, url: path }];
  }

  // Workflows
  if (path === '/flows') return [home, { name: 'Workflows', url: '/flows' }];

  // Single tools (/merge, /compress, …)
  const tool = getTool(path.slice(1));
  if (tool) return [home, { name: tool.name, url: path }];

  return [];
}
