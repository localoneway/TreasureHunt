// Mobile copy-paste into dashboard env var fields frequently introduces a stray
// leading/trailing space or trailing newline that's invisible in a "reveal" preview
// but breaks exact-match auth (Basic Auth headers, API secrets). Trim everything
// read this way and treat a whitespace-only value as unset.
export function getEnv(name: string): string | undefined {
  const value = process.env[name];
  if (value == null) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
