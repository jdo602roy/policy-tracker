const { MongoClient, ObjectId } = require('mongodb'); // Make sure ObjectId is here
const express = require('express');
const cors = require('cors');

// --- Your Settings ---
const MONGO_URI = 'YOUR_KEY_WILL_GO_HERE'; // Your connection string
const DB_NAME = 'policyTracker';
const PORT = 3000; 

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

// === THIS IS THE NEW ENDPOINT YOU ADDED ===
// It gets ONE bill by its ID for the detail page
app.get('/api/bill/:id', async (req, res) => {
  try {
    const billId = req.params.id;
    const billsCollection = db.collection('bills');
    const bill = await billsCollection.findOne({ _id: new ObjectId(billId) });

    if (!bill) {
      res.status(404).json({ error: "Bill not found" });
      return;
    }
    
    res.json(bill); 
    
  } catch (error) {
    console.error("Error fetching single bill:", error);
    res.status(500).json({ error: "An error occurred." });
  }
});


// --- Start the Server ---
async function startServer() {
  await connectToDb();
  
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

startServer();