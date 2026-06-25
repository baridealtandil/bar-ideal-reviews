const MAKE_WEBHOOK_URL = 'https://hook.us2.make.com/m6bxs7mmr9qa231liqx2523b41gwl0v4';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const response = await fetch(MAKE_WEBHOOK_URL);
    const data = await response.json();

    // data.reviews => array de reseñas del data store bar_ideal_reseñas
    // data.stats   => objeto con estadísticas del data store bar_ideal_stats

    const reviews = (data.reviews || []).map(r => ({
      author_name: r.reviewer,
      rating: Number(r.rating),
      text: r.comment || '',
      time: r.createTime ? Math.floor(new Date(r.createTime).getTime() / 1000) : 0,
      relative_time_description: r.createTime
        ? formatRelativeTime(r.createTime)
        : '',
      hasReply: r.hasReply || false,
      replyText: r.replyText || '',
      reviewId: r.reviewId || ''
    }));

    const stats = data.stats || {};

    res.status(200).json({
      // Compatibilidad con el dashboard actual
      rating: stats.promedioGeneral || 0,
      userRatingCount: stats.totalHistorico || 0,
      reviews,

      // Datos nuevos para el dashboard mejorado
      stats: {
        totalMes: stats.totalMes || 0,
        promedioMes: stats.promedioMes || 0,
        promedioGeneral: stats.promedioGeneral || 0,
        totalHistorico: stats.totalHistorico || 0,
        sinResponder: stats.sinResponder || 0,
        stars5: stats.stars5 || 0,
        stars4: stats.stars4 || 0,
        stars3: stats.stars3 || 0,
        stars2: stats.stars2 || 0,
        stars1: stats.stars1 || 0,
        empleados: stats.empleados || '',
        ultimaSync: stats.ultimaSync || null
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function formatRelativeTime(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;
  if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
  if (diffDays < 365) return `Hace ${Math.floor(diffDays / 30)} meses`;
  return `Hace ${Math.floor(diffDays / 365)} años`;
}
