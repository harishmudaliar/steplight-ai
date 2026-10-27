export function resolveApiBaseUrl(
  configuredUrl: string | undefined,
  isProduction: boolean,
  developmentFallback = 'http://127.0.0.1:18765/api'
): string {
  const value = configuredUrl?.trim();
  if (!value) {
    if (isProduction) {
      throw new Error('VITE_API_BASE_URL must be set to the deployed API URL for production builds.');
    }
    return developmentFallback.replace(/\/+$/, '');
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('VITE_API_BASE_URL must be an absolute URL.');
  }

  if (isProduction && (parsed.protocol !== 'https:' || isLocalHostname(parsed.hostname))) {
    throw new Error('Production VITE_API_BASE_URL must use HTTPS and must not point to localhost.');
  }
  if (isProduction && (parsed.username || parsed.password || parsed.search || parsed.hash)) {
    throw new Error('Production VITE_API_BASE_URL must not contain credentials, a query, or a fragment.');
  }

  return value.replace(/\/+$/, '');
}

function isLocalHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  return normalized === 'localhost' || normalized === '127.0.0.1' || normalized === '::1';
}
