import { Router } from 'express';
import { getDb } from '../db/index.js';

const router = Router();

// POST /api/ai/generate-content — Generate SEO-optimized title + description
router.post('/generate-content', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const { keywords, targetUrl, snippetCount } = req.body;
  if (!keywords || keywords.length === 0) {
    return res.status(400).json({ error: 'At least one keyword is required' });
  }

  // Get user's API key
  const db = getDb();
  const user = db.prepare('SELECT gemini_api_key FROM users WHERE id = ?').get(req.user.id);
  
  if (!user?.gemini_api_key) {
    return res.status(400).json({ 
      error: 'No API key configured',
      needsApiKey: true,
      message: 'Add your free Gemini API key in Profile Settings → AI Integration'
    });
  }

  const keywordList = Array.isArray(keywords) ? keywords.join(', ') : keywords;
  const count = Math.min(snippetCount || 1, 5);

  const prompt = `You are an SEO content specialist. Generate ${count} unique content snippet(s) for backlinking/social bookmarking purposes.

Keywords: ${keywordList}
${targetUrl ? `Target URL: ${targetUrl}` : ''}

For EACH snippet, generate:
1. **Title**: A compelling, SEO-friendly title (50-70 chars) that naturally includes the primary keyword
2. **Description**: An engaging description (150-300 chars) optimized for the keywords

IMPORTANT formatting rules for the description:
- Wrap each keyword occurrence in <strong> tags for emphasis
- ${targetUrl ? `Include the target URL as a natural hyperlink using <a href="${targetUrl}">anchor text</a> format` : 'Do NOT include any hyperlinks'}
- Write naturally — avoid keyword stuffing
- Each snippet should be unique and differently worded (use varied phrasing/angles)

Return ONLY valid JSON in this exact format (no markdown, no code blocks):
[
  {
    "title": "Your Title Here",
    "description": "Your <strong>keyword</strong> rich description with <a href=\\"url\\">link text</a>."
  }
]`;

  try {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${user.gemini_api_key}`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 2048,
        }
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      if (response.status === 400 || response.status === 403) {
        return res.status(400).json({ error: 'Invalid API key or quota exceeded. Check your Gemini API key.' });
      }
      return res.status(500).json({ error: errData.error?.message || 'Gemini API request failed' });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      return res.status(500).json({ error: 'No content generated. Try again.' });
    }

    // Parse JSON from response (strip markdown code blocks if present)
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const snippets = JSON.parse(cleaned);

    res.json({ snippets });
  } catch (err) {
    console.error('AI generation error:', err);
    if (err instanceof SyntaxError) {
      return res.status(500).json({ error: 'Failed to parse AI response. Try again.' });
    }
    res.status(500).json({ error: err.message || 'AI generation failed' });
  }
});

// POST /api/ai/rephrase — Generate a unique variation of an existing text
router.post('/rephrase', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Text to rephrase is required' });
  }

  // Get user's API key
  const db = getDb();
  const user = db.prepare('SELECT gemini_api_key FROM users WHERE id = ?').get(req.user.id);
  
  if (!user?.gemini_api_key) {
    return res.status(400).json({ 
      error: 'No API key configured',
      needsApiKey: true,
      message: 'Add your free Gemini API key in Profile Settings → AI Integration'
    });
  }

  const prompt = `You are an SEO content specialist. Rephrase the following text to make it 100% unique so it is not flagged as duplicate content by search engines, but KEEP the exact same formatting, HTML tags (especially <strong> and <a> tags), and general meaning. Do not change the core message or insert any of your own commentary.

Text to rephrase:
${text}

Return ONLY the rephrased string, nothing else.`;

  try {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${user.gemini_api_key}`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        }
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      if (response.status === 400 || response.status === 403) {
        return res.status(400).json({ error: 'Invalid API key or quota exceeded. Check your Gemini API key.' });
      }
      return res.status(500).json({ error: errData.error?.message || 'Gemini API request failed' });
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!resultText) {
      return res.status(500).json({ error: 'No content generated. Try again.' });
    }

    res.json({ rephrased: resultText.trim() });
  } catch (err) {
    console.error('AI rephrase error:', err);
    res.status(500).json({ error: err.message || 'AI rephrase failed' });
  }
});

export default router;
