// Shared URL policy for viewer controls and native media links.
export function sanitizeUrl(url) {
  var trimmed = typeof url === 'string' ? url.trim() : '';
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^\//.test(trimmed)) return trimmed;
  return '';
}
