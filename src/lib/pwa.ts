/** Retire only this app's generated worker; leave other registrations and caches alone. */
export async function unregisterAppServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  const workerUrl = new URL(`${import.meta.env.BASE_URL}sw.js`, location.origin).href;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => {
    const workers = [registration.active, registration.waiting, registration.installing];
    return workers.some((worker) => worker?.scriptURL === workerUrl)
      ? registration.unregister()
      : Promise.resolve(false);
  }));
}
