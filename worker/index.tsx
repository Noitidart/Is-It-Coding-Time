import { renderToString } from 'react-dom/server';
import App from '../src/App';
import { config } from '../src/config';
import { computeSnapshot } from '../src/time';

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
    const body = renderToString(<App serverTz={tz} tzSource={tzSource} serverSnapshot={snapshot} />);
    const ssrPayload = JSON.stringify({ tz, tzSource, snapshot });

    const ssrResponse = new HTMLRewriter()
      .on('#root', {
        element: (el) => {
          el.setInnerContent(body, { html: true });
          el.after(`<script>window.__SSR__ = ${ssrPayload}</script>`, { html: true });
        },
      })
      .transform(assetResponse);

    // The answer varies by request (IP timezone, time of day) — never cache globally.
    const response = new Response(ssrResponse.body, { status: ssrResponse.status, headers: ssrResponse.headers });
    response.headers.set('Cache-Control', 'no-store');
    return response;
  },
} satisfies ExportedHandler<Env>;
