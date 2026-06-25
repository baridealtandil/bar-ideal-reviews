const PLACES_API_KEY = 'AIzaSyBGaxcMeMeaGRdrZNB8ZAXaUigFRWEny3c';
const PLACE_ID       = 'ChIJ6bz7XwAfkZURzlHBFZCwS4g';

exports.handler = async function(event, context) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${PLACE_ID}&fields=rating,user_ratings_total,reviews&language=es&reviews_sort=newest&key=${PLACES_API_KEY}`;

    const response = await fetch(url);
    const data     = await response.json();

    if (data.status !== 'OK') {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: data.status, message: data.error_message || 'Error de Google API' })
      };
    }

    const reviews = (data.result.reviews || []).sort((a, b) => b.time - a.time);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        rating:           data.result.rating || 0,
        userRatingCount:  data.result.user_ratings_total || 0,
        reviews
      })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'fetch_error', message: err.message })
    };
  }
};
