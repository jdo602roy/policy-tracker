const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = 'policyTracker';

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: "Method not allowed" });
    }

    let mongoClient;
    try {
      mongoClient = new MongoClient(MONGO_URI);
      await mongoClient.connect();
      const db = mongoClient.db(DB_NAME);
      const billsCollection = db.collection('bills');
      const bills = await billsCollection.find({}).toArray();
      res.json(bills);
    } finally {
      if (mongoClient) await mongoClient.close();
    }
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ error: "An internal server error occurred. Please try again later." });
  }
}