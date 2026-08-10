import { StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import './index.css';
import App, { type SsrPayload } from './App';
import { reviveSnapshot } from './time';

declare global {
  interface Window {
    __SSR__?: SsrPayload;
  }
}

const payload = window.__SSR__;
if (!payload) {
  throw new Error('dev-error: expected the worker to inject window.__SSR__ but it is missing');
}

hydrateRoot(
  document.getElementById('root')!,
  <StrictMode>
    <App serverTz={payload.tz} tzSource={payload.tzSource} serverSnapshot={reviveSnapshot(payload.snapshot)} />
  </StrictMode>,
);
