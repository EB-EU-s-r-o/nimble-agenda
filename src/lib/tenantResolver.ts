export interface BookingTenantHint {
  slug: string | null;
  devBusinessId: string | null;
  hostname: string;
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

function normalizeSlug(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed || null;
}

function resolveSlugFromHostname(hostname: string): string | null {
  if (!hostname || LOCAL_HOSTS.has(hostname)) return null;

  const parts = hostname.toLowerCase().split(".").filter(Boolean);
  if (parts.length < 2) return null;

  // Common deployment pattern: booking.<slug>.<tld>
  if (parts[0] === "booking" && parts.length >= 3) {
    return normalizeSlug(parts[1]);
  }

  // Generic subdomain fallback: <slug>.<domain>.<tld>
  if (parts[0] !== "www" && parts.length >= 3) {
    return normalizeSlug(parts[0]);
  }

  return null;
}

export function resolveBookingTenantHint(url: URL): BookingTenantHint {
  const querySlug = normalizeSlug(url.searchParams.get("slug"));
  const hostSlug = resolveSlugFromHostname(url.hostname);

  return {
    // Host is primary tenant source; explicit slug query can be used when host can't resolve.
    slug: hostSlug ?? querySlug,
    // DEV-only convenience for local testing. Never use in production.
    devBusinessId: url.searchParams.get("business_id"),
    hostname: url.hostname,
  };
}
