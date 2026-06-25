// Fuentes de datos:
// - Places API: promedio general real + total historico real
// - Make Data Store: reseñas detalladas + empleados (ultimas 50)

const PLACES_API_KEY = 'AIzaSyBGaxcMeMeaGRdrZNB8ZAXaUigFRWEny3c';
const PLACE_ID = 'ChIJ6bz7XwAfkZURzlHBFZCwS4g';
const MAKE_API_TOKEN = 'c941991c-0e0a-4e15-80fe-8425868afe57';
const MAKE_ZONE = 'us2.make.com';
const DATASTORE_RESENAS = 111499;
const DATASTORE_STATS = 111500;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const makeHeaders = {
      'Authorization': `Token ${MAKE_API_TOKEN}`,
      'Content-Type': 'application/json'
    };

    // Llamadas en paralelo: Places API + Make Data Stores
    const [placesRes, resenasRes, statsRes] = await Promise.all([
      fetch(`https://maps.googleapis.com/maps/api/place/details/json?place_id=${PLACE_ID}&fields=rating,user_ratings_total&key=${PLACES_API_KEY}`),
      fetch(`https://${MAKE_ZONE}/api/v2/data-stores/${DATASTORE_RESENAS}/data?pg[limit]=50`, { headers: makeHeaders }),
      fetch(`https://${MAKE_ZONE}/api/v2/data-stores/${DATASTORE_STATS}/data?pg[limit]=1`, { headers: makeHeaders })
    ]);

    const placesData = await placesRes.json();
    const resenasData = await resenasRes.json();
    const statsData = await statsRes.json();

    // Datos reales de Google
    const ratingReal = placesData.result?.rating || 0;
    const totalReal = placesData.result?.user_ratings_total || 0;

    // Reseñas detalladas del data store de Make
    const reviews = (resenasData.records || []).map(r => ({
      author_name: r.data.reviewer || '',
      rating: Number(r.data.rating) || 0,
      text: r.data.comment || '',
      time: r.data.createTime ? Math.floor(new Date(r.data.createTime).getTime() / 1000) : 0,
      relative_time_description: r.data.createTime ? formatRelativeTime(r.data.createTime) : '',
      hasReply: r.data.hasReply === true || r.data.hasReply === 'true',
      replyText: r.data.replyText || '',
      reviewId: r.data.reviewId || ''
    }));

    reviews.sort((a, b) => b.time - a.time);

    // Stats del mes (sobre las 50 reseñas del data store)
    const rawStats = statsData.records?.[0]?.data || {};
    const sinResponderMes = reviews.filter(r => !r.hasReply).length;

    // Distribución por estrellas de las ultimas 50
    const stars5 = reviews.filter(r => r.rating === 5).length;
    const stars4 = reviews.filter(r => r.rating === 4).length;
    const stars3 = reviews.filter(r => r.rating === 3).length;
    const stars2 = reviews.filter(r => r.rating === 2).length;
    const stars1 = reviews.filter(r => r.rating === 1).length;
    const promedioMes = reviews.length > 0
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
      : 0;

    res.status(200).json({
      // Datos reales de Google (historico completo)
      rating: ratingReal,
      userRatingCount: totalReal,
      reviews,
      stats: {
        // Historico real de Google
        promedioGeneral: ratingReal,
        totalHistorico: totalReal,
        // Del mes (ultimas 50 reseñas de Make)
        totalMes: reviews.length,
        promedioMes,
        sinResponder: sinResponderMes,
        stars5,
        stars4,
        stars3,
        stars2,
        stars1,
        empleados: rawStats.empleados || '',
        ultimaSync: rawStats.ultimaSync || new Date().toISOString()
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function formatRelativeTime(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} dias`;
  if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
  if (diffDays < 365) return `Hace ${Math.floor(diffDays / 30)} meses`;
  return `Hace ${Math.floor(diffDays / 365)} anos`;
}