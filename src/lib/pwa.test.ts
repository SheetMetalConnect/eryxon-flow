import { afterEach, describe, expect, it, vi } from 'vitest';
import { unregisterAppServiceWorker } from './pwa';

afterEach(() => vi.unstubAllGlobals());

describe('disabled PWA cleanup', () => {
  it('unregisters only this app worker and keeps unrelated registrations', async () => {
    const ownUnregister = vi.fn().mockResolvedValue(true);
    const otherUnregister = vi.fn().mockResolvedValue(true);
    vi.stubGlobal('navigator', { serviceWorker: { getRegistrations: vi.fn().mockResolvedValue([
      { active: { scriptURL: new URL('/sw.js', location.origin).href }, unregister: ownUnregister },
      { active: { scriptURL: new URL('/other/sw.js', location.origin).href }, unregister: otherUnregister },
    ]) } });
    await unregisterAppServiceWorker();
    expect(ownUnregister).toHaveBeenCalledOnce();
    expect(otherUnregister).not.toHaveBeenCalled();
  });

  it('supports browsers without service workers', async () => {
    vi.stubGlobal('navigator', {});
    await expect(unregisterAppServiceWorker()).resolves.toBeUndefined();
  });
});
