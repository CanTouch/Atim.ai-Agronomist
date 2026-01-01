
/**
 * ATIM.AI BACKEND BRIDGE (Node.js / Express)
 * Deploy this to Render, Heroku, or Fly.io to connect to a real phone.
 */
const express = require('express');
const bodyParser = require('body-parser');
const { GoogleGenAI } = require('@google/genai');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_PROMPT = `
You are Atim.ai, a lady agronomist for feature phones in Uganda. 
Speak strictly English unless Acoli is requested.
USSD Rules: Max 160 chars. No emojis. No markdown. 
Response must be plain text for a 2G screen.
`;

app.post('/ussd', async (req, res) => {
    // 1. Get data from Africa's Talking
    const { sessionId, serviceCode, phoneNumber, text } = req.body;

    // 2. Extract the latest user input
    // AT sends the full chain: "1*2*maize". We want the last part.
    const textArray = text.split('*');
    const userPrompt = textArray[textArray.length - 1] || "Hello";

    let responseMessage = "";

    try {
        // 3. Query Gemini
        const response = await genAI.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: userPrompt,
            config: { systemInstruction: SYSTEM_PROMPT }
        });
        
        // 4. Format for USSD (CON = keep session open, END = close session)
        const aiText = response.text.substring(0, 155); // Ensure it fits screen
        responseMessage = `CON ${aiText}`;
        
        // If the AI says goodbye or finished, use "END" instead
        if (aiText.toLowerCase().includes("goodbye") || aiText.toLowerCase().includes("apwoyo")) {
            responseMessage = `END ${aiText}`;
        }
    } catch (error) {
        responseMessage = "END System error. Please try again later.";
    }

    // 5. Send back to the Gateway
    res.set('Content-Type', 'text/plain');
    res.send(responseMessage);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Atim Bridge running on port ${PORT}`));
