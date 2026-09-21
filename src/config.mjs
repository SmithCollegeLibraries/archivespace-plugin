// Pure configuration: no access to window or the DOM.
export function parseCantaloupeBase(baseUrl) {
  var parsed;
  var trimmed;

  if (typeof baseUrl !== 'string') return '';
  trimmed = baseUrl.trim();
  if (!trimmed) return '';
  if (/^\/(?!\/)/.test(trimmed)) return trimmed.replace(/\/$/, '');
  try {
    parsed = new URL(trimmed);
  } catch (err) {
    return '';
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
  return trimmed.replace(/\/$/, '');
}

export function parseCompassHost(baseUrl) {
  var parsed;

  if (typeof baseUrl !== 'string' || !baseUrl.trim()) return '';
  try {
    parsed = new URL(baseUrl.trim());
  } catch (err) {
    return '';
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
  return parsed.hostname ? parsed.hostname.toLowerCase() : '';
}

export function getLoadingTimeout(options) {
  var configured = options && options.loadingTimeoutMs;
  var timeout = Number(configured);

  if (typeof configured === 'undefined') timeout = 30000;
  if (!isFinite(timeout) || timeout <= 0) return 30000;
  return timeout;
}

export function readConfig(input) {
  const cfg = Object.assign({
    cantaloupeBaseUrl: '', compassBaseUrl: '',
    preservicaApiBase: '',
    loadingTimeoutMs: 30000,
  }, input || {});
  cfg.cantaloupeBaseUrl = parseCantaloupeBase(cfg.cantaloupeBaseUrl);
  cfg.compassHost = parseCompassHost(cfg.compassBaseUrl);
  return cfg;
}
