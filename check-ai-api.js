const { GoogleGenerativeAI } = require('@google/generative-ai');

const GOOGLE_AI_KEY = 'AIzaSyCh6ZdvCwxBx0X-SobQ6f5On1eg67UWTY4';

const genAI = new GoogleGenerativeAI(GOOGLE_AI_KEY);

async function testAPI() {
    console.log("Testing Google AI API Key with a simple generation...");
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); // Updated to a supported model
        const result = await model.generateContent("Hello, world!");
        
        console.log("--- API TEST SUCCEEDED ---");
        console.log("Generated response:", result.response.text());
    } catch (error) {
        console.error("--- API TEST FAILED ---");
        console.error(error);
    }
}

testAPI();