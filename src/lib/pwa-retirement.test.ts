// @vitest-environment node
import { mkdtemp, writeFile, rm, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { runInNewContext } from 'node:vm';
import { build } from 'vite';
import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => vi.unstubAllEnvs());

it('disabled builds replace old workers without reloading pages or deleting caches', async () => {
  vi.stubEnv('VITE_ENABLE_PWA', 'false');
  const root = await realpath(await mkdtemp(path.join(tmpdir(), 'eryxon-pwa-retirement-')));
  try {
    await writeFile(path.join(root, 'index.html'), '<html><head><link rel="manifest" href="/manifest.webmanifest"></head><body>New build</body></html>');
    const result = await build({
      configFile: path.resolve('vite.config.ts'),
      root,
      publicDir: false,
      logLevel: 'silent',
      build: { write: false, rollupOptions: { output: { manualChunks: () => undefined } } },
    });
    const outputs = (Array.isArray(result) ? result : 'output' in result ? [result] : []).flatMap((bundle) => bundle.output);
    const worker = outputs.find((output) => output.fileName === 'sw.js');
    expect(worker?.type).toBe('asset');
    if (worker?.type !== 'asset') throw new Error('Disabled build must serve the retirement worker at the previous URL');
    const source = typeof worker.source === 'string' ? worker.source : new TextDecoder().decode(worker.source);
    type LifecycleEvent = { waitUntil: (promise: Promise<unknown>) => void };
    const listeners = new Map<string, (event: LifecycleEvent) => void>();
    const skipWaiting = vi.fn().mockResolvedValue(undefined);
    const unregister = vi.fn().mockResolvedValue(true);
    // No navigation or cache APIs: retirement must preserve open pages and caches.
    runInNewContext(source, {
      self: {
        addEventListener: (name: string, callback: (event: LifecycleEvent) => void) => listeners.set(name, callback),
        skipWaiting,
        registration: { unregister },
      },
    });
    expect([...listeners.keys()]).toEqual(['install', 'activate']);
    const pending: Promise<unknown>[] = [];
    const event = { waitUntil: (promise: Promise<unknown>) => { pending.push(promise); } };
    listeners.get('install')?.(event);
    expect(skipWaiting).toHaveBeenCalledOnce();
    listeners.get('activate')?.(event);
    expect(unregister).toHaveBeenCalledOnce();
    await Promise.all(pending);
    expect(pending).toHaveLength(2);
    const html = outputs.find((output) => output.fileName === 'index.html');
    expect(html?.type === 'asset' && String(html.source)).not.toContain('rel="manifest"');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
