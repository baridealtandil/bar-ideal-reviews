import { google } from 'googleapis';

const MAKE_API_TOKEN = 'c941991c-0e0a-4e15-80fe-8425868afe57';
const MAKE_ZONE = 'us2.make.com';
const DATASTORE_STATS = 111500;
const DATASTORE_RESENAS = 111499;

// Credenciales OAuth de Google (las mismas que usa Make internamente)
// Las obtenemos del data store de Make donde guardamos el access token
const ACCOUNT = 'accounts/116155126364821567275';
const LOCATION = 'locations/18147568291131927188';
const GBP_BASE = 'https://mybusiness.googleapis.com/v4';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const makeHeaders = {
      'Authorization': `Token ${MAKE_API_TOKEN}`,
      'Content-Type': 'application/json'
    };

    // Leemos el token de acceso guardado en el data store de control
    const controlRes = await fetch(
      `https://${MAKE_ZONE}/api/v2/data-stores/111525/data?pg[limit]=1`,
      { headers: makeHeaders }
    );
    const controlData = await controlRes.json();
    const accessToken = controlData.records?.[0]?.data?.accessToken;

    if (!accessToken) {
      return res.status(400).json({ error: 'No access token disponible. Ejecuta primero el escenario de Make.' });
    }

    // Paginamos todas las reseñas
    const stats = { stars5: 0, stars4: 0, stars3: 0, stars2: 0, stars1: 0, sinResponder: 0, total: 0, empleados: {} };
    const ultimasResenas = [];
    let pageToken = '';
    let paginas = 0;

    do {
      const url = new URL(`${GBP_BASE}/${ACCOUNT}/${LOCATION}/reviews`);
      url.searchParams.set('pageSize', '50');
      url.searchParams.set('orderBy', 'updateTime desc');
      if (pageToken) url.searchParams.set('pageToken', pageToken);

      const r = await fetch(url.toString(), {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const d = await r.json();

      if (!d.reviews) break;

      for (const rev of d.reviews) {
        stats.total++;
        const rating = rev.starRating;
        if (rating === 'FIVE') stats.stars5++;
        else if (rating === 'FOUR') stats.stars4++;
        else if (rating === 'THREE') stats.stars3++;
        else if (rating === 'TWO') stats.stars2++;
        else stats.stars1++;

        if (!rev.reviewReply?.comment) stats.sinResponder++;

        const name = rev.reviewer?.displayName || '';
        if (name) stats.empleados[name] = (stats.empleados[name] || 0) + 1;

        // Guardamos las ultimas 50
        if (paginas === 0) {
          ultimasResenas.push({
            reviewId: rev.reviewId,
            reviewer: name,
            rating: { FIVE: 5, FOUR: 4, THREE: 3, TWO: 2, ONE: 1 }[rating] || 0,
            comment: rev.comment || '',
            createTime: rev.createTime,
            hasReply: !!rev.reviewReply?.comment,
            replyText: rev.reviewReply?.comment || ''
          });
        }
      }

      pageToken = d.nextPageToken || '';
      paginas++;
    } while (pageToken && paginas < 50);

    // Guardamos stats en Make
    await fetch(`https://${MAKE_ZONE}/api/v2/data-stores/${DATASTORE_STATS}/data/current_stats`, {
      method: 'PUT',
      headers: makeHeaders,
      body: JSON.stringify({
        key: 'current_stats',
        data: {
          stars5: stats.stars5, stars4: stats.stars4, stars3: stats.stars3,
          stars2: stats.stars2, stars1: stats.stars1,
          sinResponder: stats.sinResponder, totalHistorico: stats.total,
          empleados: JSON.stringify(stats.empleados),
          ultimaSync: new Date().toISOString(),
          promedioGeneral: parseFloat(((stats.stars5*5 + stats.stars4*4 + stats.stars3*3 + stats.stars2*2 + stats.stars1) / stats.total).toFixed(1))
        }
      })
    });

    res.status(200).json({ ok: true, total: stats.total, paginas, stats });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}