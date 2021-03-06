import fetchWrapper from './fetchWrapper';

/**
 * Fetch and cache a request
 * @param {string|URL} url
 * @param {number} maxAge max cache duration in ms
 */
export default async function fetchAndCache(url, maxAge = 5 * 60 * 1000) {
  if (!('caches' in window)) {
    return fetchWrapper(url);
  }

  let cache;
  try {
    const cacheName = new URL(url).origin;
    cache = await caches.open(cacheName);
    const response = await cache.match(url);
    if (response && new Date(response.headers.get('Expires')) > new Date()) {
      return response;
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to use Cache API.', err);
  }

  // otherwise fetch new data and cache
  const response = await fetchWrapper(url);

  // cache response
  if (cache && response.ok) {
    try {
      const clonedResponse = response.clone();
      const headers = new Headers(response.headers);
      const expiryDate = new Date(Date.now() + maxAge);
      headers.set('Expires', expiryDate.toUTCString());
      const cacheResponse = new Response(await clonedResponse.blob(), {
        headers,
      });
      // put in cache, and forget it (there is no recovery if it throws, but that's ok).
      // eslint-disable-next-line no-console
      cache.put(url, cacheResponse).catch(console.error);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed cache response.', error);
    }
  }
  return response;
}
