const { MongoClient, ObjectId } = require('mongodb'); // Make sure ObjectId is here
const express = require('express');
const cors = require('cors');

// --- Your Settings ---
const MONGO_URI = process.env.MONGO_URI; 
const DB_NAME = 'policyTracker';
const PORT = process.env.PORT || 3000; 
// ----------------------------------------------------------------------------------
// NOTE: Vercel does not pass GOOGLE_AI_KEY or CONGRESS_API_KEY to the server.js file. 
// However, the new /api/representatives endpoint now needs the GEOCODIO_API_KEY.
// We'll rely on the server.js file reading process.env.GEOCODIO_API_KEY
// in the /api/representatives endpoint (from the code I sent before).
// ----------------------------------------------------------------------------------

const app = express();
app.use(cors());

let db;

async function connectToDb() {
  try {
    const mongoClient = new MongoClient(MONGO_URI);
    await mongoClient.connect();
    
    db = mongoClient.db(DB_NAME); 
    console.log(`Connected to MongoDB database: ${DB_NAME}`);
    
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    process.exit(1); 
  }
}

// --- Define Your API "Endpoints" ---

// === THIS IS THE ENDPOINT THAT WAS MISSING ===
// It gets ALL bills for the homepage
app.get('/api/bills', async (req, res) => {
  try {
    const billsCollection = db.collection('bills');
    const bills = await billsCollection.find({}).toArray();
    res.json(bills); 
  } catch (error) {
    console.error("Error fetching bills:", error);
    res.status(500).json({ error: "An error occurred." });
  }
});
// --- NEW ENDPOINT: GET REPRESENTATIVES (SECURELY) ---
// This endpoint securely fetches data from Geocodio
app.get('/api/representatives', async (req, res) => {
    try {
        // The zip code is passed as a query parameter from the front-end: /api/representatives?zip=90210
        const zip = req.query.zip;
        
        // --- NOTE: We use process.env to access the secret key stored in Vercel ---
        const GEOCODIO_API_KEY = process.env.GEOCODIO_API_KEY;

        const url = `https://api.geocod.io/v1.7/geocode?q=${zip}&fields=cd&api_key=${GEOCODIO_API_KEY}`;
        
        const response = await axios.get(url);
        
        if (response.data.results && response.data.results.length > 0) {
            const result = response.data.results[0];
            
            // We only send back the representative data, not the whole response
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
});
// ----------------------------------------------------

// --- Start the Server ---
async function startServer() {
  await connectToDb();
  
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

startServer();