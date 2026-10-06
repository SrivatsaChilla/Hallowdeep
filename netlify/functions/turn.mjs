// Relay logins for co-op. Some networks block direct connections between players; a TURN relay gets them through.
// This mints short-lived Cloudflare TURN credentials so the long-term key never reaches the browser.
// Needs two environment variables in Netlify: CF_TURN_KEY_ID and CF_TURN_API_TOKEN. Without them it answers 404 and
// the game connects players directly only.
const TTL_SECONDS = 86400;
const CLOUDFLARE = 'https://rtc.live.cloudflare.com/v1/turn/keys';

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
});

export default async (req) => {
  const id = process.env.CF_TURN_KEY_ID;
  const token = process.env.CF_TURN_API_TOKEN;
  if (!id || !token) return json(404, { error: 'no relay configured' });
  // Only the game's own pages ask for relay logins.
  const origin = req.headers.get('origin') || req.headers.get('referer') || '';
  const host = req.headers.get('host') || '';
  if (origin && host && !origin.includes(host)) return json(403, { error: 'wrong site' });
  try {
    const r = await fetch(`${CLOUDFLARE}/${encodeURIComponent(id)}/credentials/generate-ice-servers`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ ttl: TTL_SECONDS }),
    });
    if (!r.ok) {
      console.error(`turn: Cloudflare answered ${r.status}`);
      return json(502, { error: 'relay unavailable' });
    }
    const data = await r.json();
    const servers = Array.isArray(data.iceServers) ? data.iceServers : data.iceServers ? [data.iceServers] : [];
    return json(200, { iceServers: servers });
  } catch (e) {
    console.error('turn: could not reach Cloudflare', e);
    return json(502, { error: 'relay unavailable' });
  }
};
