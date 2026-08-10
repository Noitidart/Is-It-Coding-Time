import { renderToString } from 'react-dom/server';
import App from '../src/App';
import { config } from '../src/config';
import { computeSnapshot, type ModelSnapshot } from '../src/time';

/**
 * When the YES/NO answer flips for a model — not merely when its status changes.
 * A discount window ending into off-discount keeps the answer YES, so for a YES
 * model only the next peak window's start flips it (peak is the sole NO). For a
 * NO model the current peak's end flips it back to YES.
 */
function answerFlipAt(model: ModelSnapshot): Date | null {
  if (model.status === 'peak') return model.boundary.at;
  const nextPeak = model.upcoming.find((window) => window.kind === 'peak');
  return nextPeak ? nextPeak.start : null;
}

export default {
  async fetch(request, env) {
    const assetResponse = await env.ASSETS.fetch(request);
    const contentType = assetResponse.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html') || request.method === 'HEAD') {
      // Static assets (js/css/favicon) pass through untouched. HEAD returns no body,
      // so HTMLRewriter (which streams the body) must not run on it.
      return assetResponse;
    }

    // IP-derived timezone; config.timezone is the fallback (local dev, missing data).
    const tz = request.cf?.timezone ?? config.timezone;
    const tzSource = request.cf?.timezone ? 'ip' : 'config';
    const now = new Date();
    const snapshot = computeSnapshot(now, config);

    // This is a page request (asset is text/html), but the client doesn't want
    // HTML — bots and coordinator scripts (curl defaults to `Accept: */*`) get
    // the spawn decision in JSON. Browsers always include text/html and get the page.
    // `yes` mirrors the badge (peak is the only NO); `until` is when the yes/no
    // answer flips (not a mere status change — discount ending into off-discount
    // keeps YES), and `millisUntil` counts from computedAt so bots skip date math.
    const accept = request.headers.get('accept') ?? '';
    if (!accept.includes('text/html')) {
      const models = snapshot.models.map((model) => {
        const flip = answerFlipAt(model);
        return {
          id: model.id,
          yes: model.status !== 'peak',
          until: flip ? flip.toISOString() : null,
          millisUntil: flip ? flip.getTime() - now.getTime() : null
        };
      });
      return Response.json(
        {
          computedAt: now.toISOString(),
          instruction:
            'Can spawn every model where yes is true; do not spawn where yes is false. until is when the yes/no answer changes (null = it never changes), millisUntil is milliseconds until then, counted from computedAt.',
          models
        },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const body = renderToString(
      <App serverTz={tz} tzSource={tzSource} serverSnapshot={snapshot} />
    );
    const ssrPayload = JSON.stringify({ tz, tzSource, snapshot });

    const ssrResponse = new HTMLRewriter()
      .on('#root', {
        element: (el) => {
          el.setInnerContent(body, { html: true });
          el.after(`<script>window.__SSR__ = ${ssrPayload}</script>`, {
            html: true
          });
        }
      })
      .transform(assetResponse);

    // The answer varies by request (IP timezone, time of day) — never cache globally.
    const response = new Response(ssrResponse.body, {
      status: ssrResponse.status,
      headers: ssrResponse.headers
    });
    response.headers.set('Cache-Control', 'no-store');
    return response;
  }
} satisfies ExportedHandler<Env>;
