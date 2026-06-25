const MAKE_API_TOKEN = 'c941991c-0e0a-4e15-80fe-8425868afe57';
const MAKE_ZONE = 'us2.make.com';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const makeHeaders = { 'Authorization': 'Token ' + MAKE_API_TOKEN, 'Content-Type': 'application/json' };
    // Probar endpoint de lista
    const r = await fetch('https://' + MAKE_ZONE + '/api/v2/data-stores/111536/data', { headers: makeHeaders });
    const d = await r.json();
    res.status(200).json({ makeStatus: r.status, raw: d });
  } catch(e) { res.status(500).json({ error: e.message }); }
}