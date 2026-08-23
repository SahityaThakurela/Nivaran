/**
 * Issue photos must be network-reachable. Local device URIs (file://, content://)
 * only resolve on the reporter's phone — treat them as missing everywhere else.
 */
export function pickRemotePhotoUrl(
  urls?: string[] | null,
): string | null {
  const url = urls?.[0]?.trim();
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("data:image/")) return url;
  return null;
}
