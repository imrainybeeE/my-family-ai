import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '2mb' }));

// Initialize Gemini SDK with server-side environment key
const geminiApiKey = process.env.GEMINI_API_KEY || '';
let aiClient: GoogleGenAI | null = null;
if (geminiApiKey) {
  try {
    aiClient = new GoogleGenAI({ apiKey: geminiApiKey });
  } catch (err) {
    console.warn('Failed to initialize GoogleGenAI client:', err);
  }
}

/**
 * AI Family Assistant endpoint
 * Primary context: Household's saved questionnaire responses.
 */
app.post('/api/ask-ai', async (req, res) => {
  try {
    const { prompt, household, activeMember, members, responses } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Build structured household context for the model
    const householdSummary = {
      code: household?.code || 'Unknown Code',
      name: household?.name || 'Our Household',
      askingMember: activeMember ? `${activeMember.nickname || activeMember.role} (${activeMember.role})` : 'Family Member',
      members: (members || []).map((m: any) => {
        const mResp = (responses && responses[m.id]) || {};
        return {
          id: m.id,
          role: m.role,
          name: m.nickname || m.role,
          discoveryStyle: mResp.discoveryProfile
            ? {
                topStyle: mResp.discoveryProfile.primaryStyle,
                secondStyle: mResp.discoveryProfile.secondaryStyle,
              }
            : 'Questionnaire not completed yet',
          actualFoundationAnswers: mResp.foundationAnswers || {},
          tasteAnswers: {
            favoriteCuisines: mResp.favoriteCuisines || [],
            foodDislikes: mResp.foodDislikes || [],
            movieGenres: mResp.movieGenres || [],
            weekendActivities: mResp.weekendActivities || [],
          },
        };
      }),
    };

    const systemInstruction = `You are "My Family AI", a warm, constructive living room assistant for a school AI project app.
The household members use this app together to understand each other and find shared joy.

Primary Context:
${JSON.stringify(householdSummary, null, 2)}

Strict Ethical and Operational Rules:
1. Ground your answers strictly in the provided household questionnaire data above.
2. Clearly distinguish facts from suggestions. Always prefix factual observations with "Based on the answers provided...".
3. If the provided data does NOT contain enough information to answer the question (for example, if a member has not answered yet or the specific topic was not in the questionnaire), explicitly say that there is not enough information in the answers provided. Do NOT invent or assume answers. Then suggest an appropriate, friendly open question the family could discuss together in the living room.
4. NEVER diagnose mental health conditions, personality disorders, relationship pathology, or parenting quality.
5. NEVER criticize or rank family members (no "Member X is better at Y than Member Z").
6. Treat all responses as a collaborative shared discovery experience, not as confidential gossip or secret surveillance.
7. Keep responses positive, practical, age-appropriate, warm, and concise for a mobile screen. Use short paragraphs or clear bullet points.`;

    if (aiClient) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Gemini API timeout')), 5000)
        );

        const apiPromise = aiClient.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            systemInstruction,
            temperature: 0.4,
            maxOutputTokens: 600,
          },
        });

        const response = await Promise.race([apiPromise, timeoutPromise]);
        const text = response.text || 'Based on the answers provided, there is not enough information yet to answer this question. Try discussing this question together at your next family dinner!';
        return res.json({ text });
      } catch (geminiErr) {
        console.warn('Gemini generateContent timed out or threw error, using fallback:', geminiErr);
      }
    }

    // Graceful fallback if GEMINI_API_KEY is not configured or times out
    return res.json({
      text: `Based on the answers provided by your household (${householdSummary.askingMember})... we are focusing on your shared food, movie, and weekend discovery styles. If this question is about a new topic, it's a great candidate for living room discussion!`,
    });
  } catch (error: any) {
    console.error('Ask AI endpoint error:', error);
    return res.status(200).json({
      text: 'Based on the answers provided, we could not generate a response at this moment. You can discuss this together with your family!',
    });
  }
});

// Mount Vite middleware in development or serve static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const listenPort = Number(port);
  app.listen(listenPort, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${listenPort} in ${isProd ? 'production' : 'development'} mode`);
  });
}

startServer();
