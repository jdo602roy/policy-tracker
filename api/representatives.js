const axios = require('axios');

const GEOCODIO_API_KEY = process.env.GEOCODIO_API_KEY;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const zip = req.query.zip;

  if (!zip) {
    return res.status(400).json({ error: "Zip code required" });
  }

  try {
    const url = `https://api.geocod.io/v1.7/geocode?q=${zip}&fields=cd&api_key=${GEOCODIO_API_KEY}`;
    const response = await axios.get(url);
    
    if (response.data.results && response.data.results.length > 0) {
      const result = response.data.results[0];
      const repData = result.fields.congressional_districts.flatMap(d => d.current_legislators.map(p => ({
        name: `${p.bio.first_name} ${p.bio.last_name}`,
        party: p.bio.party,
        title: p.type === 'senator' ? 'Senator' : 'Representative'
      })));
      
      res.json(repData);
    } else {
      res.status(404).json({ message: "No representatives found for that zip code." });
    }
  } catch (error) {
    console.error("Error fetching representatives:", error.message);
    res.status(500).json({ error: "Could not connect to Geocodio service." });
  }
}