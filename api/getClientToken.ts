// ...existing code...
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getFetch(): Promise<typeof fetch> {
  if (typeof fetch === "function") return fetch.bind(globalThis) as unknown as typeof fetch;
  // dynamic import fallback for local dev where global fetch may be missing
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = await import("node-fetch");
    // node-fetch types are not fully compatible with DOM fetch type in TS projects;
    // cast via unknown to satisfy the compiler.
    return (mod && (mod.default || mod)) as unknown as typeof fetch;
  } catch (e) {
    throw new Error("No fetch available (install node-fetch for local dev)");
  }
}

export async function getClientToken() {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  // If user provided a pre-generated OAuth token in env, use it
  const preToken = process.env.SOUNDCLOUD_OAUTH_TOKEN;
  if (preToken) {
    // cache short-term to avoid calling process.env repeatedly
    cachedToken = { token: preToken, expiresAt: Date.now() + 5 * 60 * 1000 };
    return preToken;
  }

  const CLIENT_ID = process.env.SOUNDCLOUD_CLIENT_ID;
  const CLIENT_SECRET = process.env.SOUNDCLOUD_CLIENT_SECRET;

  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error(
      "Missing SoundCloud credentials. Set SOUNDCLOUD_OAUTH_TOKEN or both SOUNDCLOUD_CLIENT_ID and SOUNDCLOUD_CLIENT_SECRET."
    );
  }

  const fetchFn = await getFetch();

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: "client_credentials",
  });

  const res = await fetchFn("https://api.soundcloud.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "soundcloud-token-client/1.0" },
    body: params.toString(),
  });

  const text = await res.text().catch(() => "");
  if (!res.ok) {
    const msg = text || `Status ${res.status}`;
    throw new Error("Token request failed: " + msg);
  }

  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("Token response not valid JSON: " + text);
  }

  const token = json.access_token;
  if (!token) throw new Error("Token response missing access_token: " + text);

  const expiresIn = Number(json.expires_in) || 6 * 3600;
  cachedToken = { token, expiresAt: Date.now() + (expiresIn - 60) * 1000 };
  return token;
}
// ...existing code...