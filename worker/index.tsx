import { renderToString } from 'react-dom/server';
import App from '../src/App';
import { config } from '../src/config';
import { computeSnapshot, getStatusAt, statusFlags } from '../src/time';

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
    // The site's own origin, so the footer can show the real curl command.
    const origin = new URL(request.url).origin;

    // This is a page request (asset is text/html), but the client doesn't want
    // HTML — bots and coordinator scripts (curl defaults to `Accept: */*`) get
    // the spawn decision in JSON. Browsers always include text/html and get the page.
    // The booleans mirror the badge/countdown: peak is the only canCode NO, and
    // off-discount is canCode YES without a discount. endsAt is when the current
    // state ends, next is the state that begins then — the yes/no answer flips
    // only when next.canCode differs from canCode. millis* count from computedAt
    // so bots skip date math.
    const accept = request.headers.get('accept') ?? '';
    if (!accept.includes('text/html')) {
      const models = snapshot.models.map((model, index) => {
        // computeSnapshot maps over config.models in order, so indexes line up.
        const modelConfig = config.models[index];
        if (!modelConfig) {
          throw new Error(`dev-error: no config for snapshot model ${model.id} but snapshots are computed from this config`);
        }
        // No boundary means the status never changes: flat pricing (no windows)
        // stays canCode true forever, a `never` provider stays canCode false
        // forever. Either way there is no end or next state to report.
        if (model.boundary === null) {
          return {
            id: model.id,
            ...statusFlags(model.status),
            endsAt: null,
            millisUntilEndsAt: null,
            next: null
          };
        }
        const endsAt = model.boundary.at;
        // Windows are half-open [start, end): the instant the current window
        // ends, the next state already governs — so the status at the boundary
        // is exactly the state that begins there.
        const nextStatus = getStatusAt(endsAt, modelConfig);
        return {
          id: model.id,
          ...statusFlags(model.status),
          endsAt: endsAt.toISOString(),
          millisUntilEndsAt: endsAt.getTime() - now.getTime(),
          next: {
            ...statusFlags(nextStatus),
            startsAt: endsAt.toISOString(),
            millisUntilStartsAt: endsAt.getTime() - now.getTime()
          }
        };
      });
      return Response.json(
        {
          computedAt: now.toISOString(),
          instruction:
            'Spawn every model where canCode is true; do not spawn where it is false. discount/peak describe the current window. endsAt is when the current state ends, next is the state that begins then (startsAt); both are null when a model has flat pricing (no windows) — it is always canCode and its state never changes. The yes/no answer flips at startsAt only when next.canCode differs from canCode. millisUntilEndsAt/millisUntilStartsAt are milliseconds until then, counted from computedAt.',
          models
        },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const body = renderToString(
      <App serverTz={tz} tzSource={tzSource} serverSnapshot={snapshot} origin={origin} />
    );
    const ssrPayload = JSON.stringify({ origin, tz, tzSource, snapshot });

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
