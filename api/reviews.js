const PLACES_API_KEY = 'AIzaSyBGaxcMeMeaGRdrZNB8ZAXaUigFRWEny3c';
const PLACE_ID = 'ChIJ6bz7XwAfkZURzlHBFZCwS4g';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${PLACE_ID}&fields=rating,user_ratings_total,reviews&language=es&reviews_sort=newest&key=${PLACES_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.status !== 'OK') throw new Error(data.status);
    const reviews = (data.result.reviews || []).sort((a, b) => b.time - a.time);
    res.status(200).json({
      rating: data.result.rating || 0,
      userRatingCount: data.result.user_ratings_total || 0,
      reviews
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
