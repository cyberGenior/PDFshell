export const dynamic = 'force-static';

/**
 * Serves /ads.txt for AdSense, derived from NEXT_PUBLIC_ADSENSE_CLIENT
 * (ca-pub-XXXX → pub-XXXX). f08c47fec0942fa0 is Google's certification-authority
 * id (constant for all AdSense publishers).
 */
export function GET(): Response {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? '';
  const pub = client.replace(/^ca-/, '');
  const body = pub
    ? `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n`
    : '# Set NEXT_PUBLIC_ADSENSE_CLIENT to publish your ads.txt line.\n';
  return new Response(body, {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}
