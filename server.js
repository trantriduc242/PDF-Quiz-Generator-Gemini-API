const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();
const {GoogleGenerativeAI} = require('@google/generative-ai')

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.post('/generateVocabulary', async (req, res) => {
    const { topic } = req.body;
    // const API_KEY = process.env.API_KEY;

    try {
        // const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/generateContent?key=${API_KEY}`, {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({
        //         prompt: `Search the online English dictionary to generate a random list of words based on ${topic} vocabulary as the structure "<word,parts of speech> - <meaning>" without saying anything else.`,
        //         maxTokens: 100,
        //         temperature: 0.7
        //     })
        // });
        const prompt = `Search the online English dictionary to generate a random list of words based on ${topic} vocabulary as the structure "<word,parts of speech> - <meaning>" without saying anything else.`;
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});

        console.log(model.generateContent('Hello!').response.text());

        const response = model.generateContent(prompt).response;
        const data = await response.json();
        res.json(data);
    } catch (error) {
        res.status(500).send(error.toString());
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    async function run() {
        const API_KEY = process.env.API_KEY;
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});
        const prompt = `Search the online English dictionary to generate a random list of words based on English C1 vocabulary as the structure "<word>(<parts of speech>) - <meaning>" without saying anything else.`;
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();
        return text;
    }
    let text = run();
    text.then(function(result) {
        console.log(result);
    });
});