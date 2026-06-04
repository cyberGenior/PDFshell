export const dynamic = 'force-dynamic';

/**
 * Ultra-light liveness probe — no DB, no work. Used as the Render health check
 * and as the target for an external keep-warm pinger (see .github/workflows/
 * keep-alive.yml) so free instances don't cold-start in front of users.
 */
export function GET(): Response {
  return new Response('ok', {
    status: 200,
    headers: { 'content-type': 'text/plain', 'cache-control': 'no-store' },
  });
}
