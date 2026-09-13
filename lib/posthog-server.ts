import { PostHog } from 'posthog-node';

// Cliente server-side de PostHog, compartido — flushAt:1 + flushInterval:0 porque estas llamadas
// corren en rutas de servidor de vida corta (no un proceso largo): sin flush inmediato, el evento
// se pierde si la función termina antes de que el buffer se vacíe solo.
let client: PostHog | null | undefined;

export function getPostHogServer(): PostHog | null {
  if (client !== undefined) return client;
  client = process.env.POSTHOG_KEY
    ? new PostHog(process.env.POSTHOG_KEY, { host: process.env.POSTHOG_HOST, flushAt: 1, flushInterval: 0 })
    : null;
  return client;
}
