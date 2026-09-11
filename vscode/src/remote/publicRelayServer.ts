import {
  BUNDLED_RELAY_TOKEN,
  DEFAULT_RELAY_PORT,
  RELAY_FALLBACK_PORT,
  listenPublicRelay,
} from './publicRelay';
import { DEFAULT_PUBLIC_HOST } from './remoteDefaults';

async function main(): Promise<void> {
  const token = process.env.GROK_RELAY_TOKEN?.trim() || BUNDLED_RELAY_TOKEN;
  const publicHost = process.env.GROK_RELAY_HOST?.trim() || DEFAULT_PUBLIC_HOST;
  const forced = Number(process.env.GROK_RELAY_PORT ?? '');
  const ports = Number.isInteger(forced) && forced > 0 ? [forced] : [DEFAULT_RELAY_PORT, RELAY_FALLBACK_PORT];
  let last: unknown;
  for (const port of ports) {
    try {
      const live = await listenPublicRelay({
        port,
        bind: process.env.GROK_RELAY_BIND?.trim() || '0.0.0.0',
        token,
        publicHost,
      });
      process.stdout.write(`grok relay http://${publicHost}${live.port === 80 ? '' : `:${live.port}`}\n`);
      return;
    } catch (error) {
      last = error;
    }
  }
  throw last instanceof Error ? last : new Error(String(last ?? 'relay listen failed'));
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
  process.exit(1);
});
