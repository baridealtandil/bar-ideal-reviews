const CLIENT_ID = '277414788395-n56bvng86992f6hfkc57o78aeoplrco0';
const CLIENT_SECRET = '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';
const MAKE_API_TOKEN = 'c941991c-0e0a-4e15-80fe-8425868afe57';
const MAKE_ZONE = 'us2.make.com';
const ACCOUNT = 'accounts/116155126364821567275';
const LOCATION = 'locations/18147568291131927188';
const DATASTORE_STATS = 111500;
const EMPLEADOS = ['Lucia C','Lucia L','Lucía C','Lucía L','Sofia L','Sofia I','Sofía L','Sofía I','Ludmila','Kevin','Yamila','Romina','Nicolas','Nicolás','Benjamin','Benjamín'];

async function getAccessToken(rt) {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ refresh_token: rt, client_id: CLIENT_ID, client_secret: CLIENT_SECRET, grant_type: 'refresh_token' })
  });
  return (await r.json()).access_token;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  try {
    const makeHeaders = { 'Authorization': 'Token ' + MAKE_API_TOKEN, 'Content-Type': 'application/json' };
    const tokenRes = await fetch('https://' + MAKE_ZONE + '/api/v2/data-stores/111525/data/google_tokens', { headers: makeHeaders });
    const tokenData = await tokenRes.json();
    const refreshToken = tokenData.record?.data?.refresh_token;
    if (!refreshToken) return res.status(401).json({ error: 'No autorizado', authUrl: 'https://bar-ideal-reviews.vercel.app/api/auth' });
    const accessToken = await getAccessToken(refreshToken);
    if (!accessToken) return res.status(401).json({ error: 'Token invalido' });
    const stats = { stars5:0, stars4:0, stars3:0, stars2:0, stars1:0, sinResponder:0, total:0 };
    const empleados = {};
    let pageToken = '', paginas = 0;
    do {
      const url = new URL('https://mybusiness.googleapis.com/v4/' + ACCOUNT + '/' + LOCATION + '/reviews');
      url.searchParams.set('pageSize','50'); url.searchParams.set('orderBy','updateTime desc');
      if (pageToken) url.searchParams.set('pageToken', pageToken);
      const r = await fetch(url.toString(), { headers: { 'Authorization': 'Bearer ' + accessToken } });
      const d = await r.json();
      if (!d.reviews) break;
      for (const rev of d.reviews) {
        stats.total++;
        const rating = rev.starRating;
        if (rating==='FIVE') stats.stars5++; else if (rating==='FOUR') stats.stars4++;
        else if (rating==='THREE') stats.stars3++; else if (rating==='TWO') stats.stars2++; else stats.stars1++;
        if (!rev.reviewReply?.comment) stats.sinResponder++;
        const texto = (rev.comment||'').toLowerCase();
        for (const emp of EMPLEADOS) {
          if (texto.includes(emp.toLowerCase())) {
            if (!empleados[emp]) empleados[emp] = { menciones:0, stars:0 };
            empleados[emp].menciones++;
            empleados[emp].stars += {FIVE:5,FOUR:4,THREE:3,TWO:2,ONE:1}[rating]||0;
          }
        }
      }
      pageToken = d.nextPageToken||''; paginas++;
    } while (pageToken && paginas < 50);
    const promedio = stats.total > 0 ? Math.round(((stats.stars5*5+stats.stars4*4+stats.stars3*3+stats.stars2*2+stats.stars1)/stats.total)*10)/10 : 0;
    const tasaRespuesta = stats.total > 0 ? Math.round(((stats.total-stats.sinResponder)/stats.total)*100) : 0;
    const rankingEmpleados = Object.entries(empleados).map(([nombre,d]) => ({ nombre, menciones:d.menciones, promedio: Math.round((d.stars/d.menciones)*10)/10 })).sort((a,b)=>b.menciones-a.menciones);
    const statsData = { stars5:stats.stars5, stars4:stats.stars4, stars3:stats.stars3, stars2:stats.stars2, stars1:stats.stars1, sinResponder:stats.sinResponder, totalHistorico:stats.total, promedioGeneral:promedio, tasaRespuesta, empleados:JSON.stringify(rankingEmpleados), ultimaSync:new Date().toISOString() };
    await fetch('https://' + MAKE_ZONE + '/api/v2/data-stores/' + DATASTORE_STATS + '/data/current_stats', {
      method: 'PUT', headers: makeHeaders,
      body: JSON.stringify({ key: 'current_stats', data: statsData })
    });
    res.status(200).json({ ok: true, stats: statsData, rankingEmpleados });
  } catch(err) { res.status(500).json({ error: err.message }); }
}