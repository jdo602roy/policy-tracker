const { MongoClient } = require('mongodb'); 
const axios = require('axios');
// 1. IMPORT THE NEW GOOGLE AI LIBRARY
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- Your Settings ---
const CONGRESS_API_KEY = 'YOUR_KEY_WILL_GO_HERE'; 
const MONGO_URI = 'YOUR_KEY_WILL_GO_HERE'; 
const DB_NAME = 'policyTracker';
const GOOGLE_AI_KEY = 'YOUR_KEY_WILL_GO_HERE';

const BILL_LIMIT = 50; 

// 3. INITIALIZE THE AI MODEL
const genAI = new GoogleGenerativeAI(GOOGLE_AI_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

/**
 * A simple auto-tagger
 */
function autoTag(title, summary) {
    const tags = new Set(); // Use a Set to avoid duplicates
    const text = (title + ' ' + summary).toLowerCase(); 

    if (text.includes('finance') || text.includes('appropriation') || text.includes('tax')) {
        tags.add('Finance');
    }
    if (text.includes('health') || text.includes('medical') || text.includes('medicare')) {
        tags.add('Health');
    }
    if (text.includes('education') || text.includes('student') || text.includes('school')) {
        tags.add('Education');
    }
    if (text.includes('security') || text.includes('defense') || text.includes('border')) {
        tags.add('National Security');
    }
    if (text.includes('technology') || text.includes('internet') || text.includes('cybersecurity')) {
        tags.add('Technology');
    }
    
    if (tags.size === 0) {
        tags.add('General');
    }
    
    return Array.from(tags); // Convert the Set back to an array
}

/**
 * 4. NEW FUNCTION: Uses AI to generate a simple summary
 */
async function autoSummarize(title, officialSummary) {
    console.log(` -> Generating summary for: ${title}`);
    
    const prompt = `
    You are a non-partisan policy analyst. 
    Summarize the following US bill for a general audience in one paragraph.
    Explain what the bill does, not its history or status.

    BILL TITLE: "${title}"
    OFFICIAL SUMMARY: "${officialSummary}"

    SIMPLE SUMMARY:
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text().trim();
    } catch (error) {
        console.error("AI Summary Error:", error);
        return null; // Return null if AI fails
    }
}

/**
 * NEW FUNCTION: Uses AI to generate effectiveness analysis
 */
async function autoAnalyze(title, officialSummary) {
    console.log(` -> Generating effectiveness analysis for: ${title}`);
    
    const prompt = `
    You are a non-partisan policy analyst with access to peer-reviewed research from sources like the Congressional Budget Office, RAND Corporation, academic journals, and other unbiased studies.
    
    Analyze the effectiveness of the following US bill:
    - How effective is it at achieving its stated goals, based on evidence?
    - What are potential unintended impacts (positive or negative)?
    - Is it the most effective method to achieve those goals, per best known research? Suggest alternatives if relevant.

    BILL TITLE: "${title}"
    OFFICIAL SUMMARY: "${officialSummary}"

    EFFECTIVENESS ANALYSIS:
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text().trim();
    } catch (error) {
        console.error("AI Analysis Error:", error);
        return null; // Return null if AI fails
    }
}

/**
 * Main function to fetch and save bills
 */
async function fetchAndSaveRecentBills() {
    let mongoClient; 
    try {
        // 1. CONNECT TO DATABASE
        mongoClient = new MongoClient(MONGO_URI);
        await mongoClient.connect();
        console.log("Connected to MongoDB!");
        const db = mongoClient.db(DB_NAME);
        const billsCollection = db.collection('bills');

        // 2. FETCH BILL LIST
        console.log(`Fetching the ${BILL_LIMIT} most recently active bills...`);
        
        const url = `https://api.congress.gov/v3/bill`;
        const response = await axios.get(url, {
            params: { 
                api_key: CONGRESS_API_KEY,
                format: 'json',
                congress: 118,
                sort: 'updateDate',
                order: 'desc',
                limit: BILL_LIMIT
            }
        });

        const bills = response.data.bills;
        console.log(`Found ${bills.length} bills. Processing...`);

        // 3. LOOP AND SAVE EACH BILL
        for (const bill of bills) {
            
            // 5. CHECK IF WE NEED TO SUMMARIZE
            // First, check if this bill is already in our database
            const existingBill = await billsCollection.findOne({ 
                number: bill.number, 
                congress: bill.congress 
            });

            let summaryToSave = null;
            let analysisToSave = null;

            // If it's not in our DB, or if it is but has no summary, generate one.
            if (!existingBill || !existingBill.easySummary) {
                summaryToSave = await autoSummarize(bill.title, bill.latestAction ? bill.latestAction.text : '');
            } else {
                // Otherwise, keep the old summary
                summaryToSave = existingBill.easySummary;
            }

            // Similarly for analysis
            if (!existingBill || !existingBill.effectivenessAnalysis) {
                analysisToSave = await autoAnalyze(bill.title, bill.latestAction ? bill.latestAction.text : '');
            } else {
                analysisToSave = existingBill.effectivenessAnalysis;
            }

            // Create the object to save
            const billToSave = {
                congress: bill.congress,
                number: bill.number,
                type: bill.type,
                title: bill.title,
                summary: bill.latestAction.text,
                lastUpdated: new Date(bill.updateDate),
                tags: autoTag(bill.title, bill.latestAction ? bill.latestAction.text : ''),
                easySummary: summaryToSave, // Add the new summary
                effectivenessAnalysis: analysisToSave // Add the new analysis
            };

            await billsCollection.updateOne(
                { number: billToSave.number, congress: billToSave.congress },
                { $set: billToSave }, 
                { upsert: true }       
            );
            
            console.log(`Saved: ${bill.type}${bill.number} (Tags: ${billToSave.tags.join(', ')})`);
        }

        console.log("\nDatabase update complete!");

    } catch (error) {
        console.error("\nAn error occurred:", error.message);
    } finally {
        if (mongoClient) {
            await mongoClient.close();
            console.log("Disconnected from MongoDB.");
        }
    }
}

// --- Run the entire pipeline ---
fetchAndSaveRecentBills();