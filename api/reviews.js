const MAKE_API_TOKEN = 'dae50940-1697-4c3c-89c1-3c88c8ba3a59';
const MAKE_ZONE = 'us2.make.com';
const DATASTORE_RESENAS = 111499;
const DATASTORE_STATS = 111500;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const headers = {
      'Authorization': `Token ${MAKE_API_TOKEN}`,
      'Content-Type': 'application/json'
    };

    const [resenasRes, statsRes] = await Promise.all([
      fetch(`https://${MAKE_ZONE}/api/v2/data-stores/${DATASTORE_RESENAS}/data?limit=50`, { headers }),
      fetch(`https://${MAKE_ZONE}/api/v2/data-stores/${DATASTORE_STATS}/data?limit=1`, { headers })
    ]);

    const resenasData = await resenasRes.json();
    const statsData = await statsRes.json();

    const rawStats = statsData.records?.[0]?.data || {};
    const reviews = (resenasData.records || []).map(r => ({
      author_name: r.data.reviewer || '',
      rating: Number(r.data.rating) || 0,
      text: r.data.comment || '',
      time: r.data.createTime ? Math.floor(new Date(r.data.createTime).getTime() / 1000) : 0,
      relative_time_description: r.data.createTime ? formatRelativeTime(r.data.createTime) : '',
      hasReply: r.data.hasReply || false,
      replyText: r.data.replyText || '',
      reviewId: r.data.reviewId || ''
    }));

    reviews.sort((a, b) => b.time - a.time);

    res.status(200).json({
      rating: rawStats.promedioGeneral || 0,
      userRatingCount: rawStats.totalHistorico || 0,
      reviews,
      stats: {
        totalMes: rawStats.totalMes || 0,
        promedioMes: rawStats.promedioMes || 0,
        promedioGeneral: rawStats.promedioGeneral || 0,
        totalHistorico: rawStats.totalHistorico || 0,
        sinResponder: rawStats.sinResponder || 0,
        stars5: rawStats.stars5 || 0,
        stars4: rawStats.stars4 || 0,
        stars3: rawStats.stars3 || 0,
        stars2: rawStats.stars2 || 0,
        stars1: rawStats.stars1 || 0,
        empleados: rawStats.empleados || '',
        ultimaSync: rawStats.ultimaSync || null
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