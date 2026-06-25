const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '277414788395-n56bvng86992f6hfkc57o78aeoplrco0';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = 'https://bar-ideal-reviews.vercel.app/api/auth';
const MAKE_API_TOKEN = 'c941991c-0e0a-4e15-80fe-8425868afe57';
const MAKE_ZONE = 'us2.make.com';

export default async function handler(req, res) {
  const { code, error } = req.query;
  if (error) return res.status(400).send('Error: ' + error);
  if (!code) {
    const url = new URL('https://accounts.google.com/o/oauth2/auth');
    url.searchParams.set('client_id', CLIENT_ID);
    url.searchParams.set('redirect_uri', REDIRECT_URI);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'https://www.googleapis.com/auth/business.manage');
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'consent');
    return res.redirect(url.toString());
  }
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: CLIENT_ID, client_secret: CLIENT_SECRET, redirect_uri: REDIRECT_URI, grant_type: 'authorization_code' })
  });
  const tokens = await tokenRes.json();
  if (tokens.error) return res.status(400).json(tokens);
  const makeHeaders = { 'Authorization': 'Token ' + MAKE_API_TOKEN, 'Content-Type': 'application/json' };
  await fetch('https://' + MAKE_ZONE + '/api/v2/data-stores/111525/data', {
    method: 'POST', headers: makeHeaders,
    body: JSON.stringify({ key: 'google_tokens', data: { refresh_token: tokens.refresh_token, access_token: tokens.access_token, savedAt: new Date().toISOString() } })
  });
  res.status(200).send('<h1>Autorizacion exitosa!</h1><p>Token guardado. Cerra esta ventana y hace clic en Sincronizar en el dashboard.</p>');
}