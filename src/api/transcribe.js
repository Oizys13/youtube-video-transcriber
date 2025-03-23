// api/index.js
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { exec } from 'child_process';
import serverless from 'serverless-http';

const app = express();

app.use(cors());
app.use(express.json());

// YouTube transcript proxy endpoint
app.post('/transcript', async (req, res) => {
  try {
    const { videoId } = req.body;
    if (!videoId) {
      return res.status(400).json({ error: 'Video ID is required' });
    }

    exec(`python get_transcript.py ${videoId}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error: ${stderr}`);
        return res.status(500).json({ error: 'Failed to fetch transcript' });
      }
      res.json({ text: stdout.trim() });
    });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch transcript' });
  }
});

const GEMINI_API_KEY = "AIzaSyDPkO6j6P4XCvlSTEjK0V996Bqth2A7UDg"; // Replace with your actual API key

app.post('/summarize', async (req, res) => {
  console.log('Received request:', req.body);
  const { text } = req.body;
  if (!text || text.trim() === '') {
    return res.status(400).json({ error: 'Missing or empty "text" in request body' });
  }

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [{
            text: `Summarize this transcript into a **concise summary** with key points:\n\n${text}`
          }]
        }]
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );

    console.log('Full API Response:', response.data);
    if (!response.data || !response.data.candidates || response.data.candidates.length === 0) {
      throw new Error('Invalid API response structure');
    }

    const summary = response.data.candidates[0]?.content?.parts?.[0]?.text || "Failed to generate summary.";
    console.log('Generated Summary:', summary);
    res.json({ summary });
  } catch (error) {
    console.error('Error summarizing text:', error.response ? error.response.data : error.message);
    res.status(500).json({ error: 'Failed to generate summary', details: error.message });
  }
});

// Export the Express app wrapped in serverless-http for Vercel
export default serverless(app);
