/**
 * schema.org JSON-LD builders, in one place. Each returns a CONTEXT-LESS node so
 * it can be reused either at the top level (wrapped by {@link ldGraph}) or nested
 * inside another node (e.g. Organization as an Article publisher) without emitting
 * a redundant `@context`.
 *
 * Only schema types that still earn search features in 2024–2025 are here:
 * Organization, WebSite + SearchAction (sitelinks searchbox), and BreadcrumbList.
 * HowTo is deliberately absent (Google deprecated HowTo rich results in 2023).
 */
import { SITE_NAME, SITE_URL, SITE_DESCRIPTION } from './seo';

const abs = (url: string) => (url.startsWith('http') ? url : `${SITE_URL}${url}`);

/** The publisher/brand. Safe to nest (no `@context`). */
export function organization() {
  return {
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/android-chrome-512x512.png`,
  };
}

/** WebSite + SearchAction. The search box pre-fills the landing tool filter via ?q=. */
export function website() {
  return {
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/?q={search_term_string}` },
      'query-input': 'required name=search_term_string',
    },
  };
}

/** A breadcrumb trail. `items` go from the site root to the current page. */
export function breadcrumbList(items: { name: string; url: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: abs(it.url),
    })),
  };
}

/** Wrap one or more context-less nodes into a single emittable JSON-LD graph. */
export function ldGraph(nodes: object[]) {
  return { '@context': 'https://schema.org', '@graph': nodes };
}
