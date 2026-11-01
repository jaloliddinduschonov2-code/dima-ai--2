
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({
      error: 'Faqat POST so‘rovi mumkin.'
    });
  }

  const SUPABASE_URL =
    'https://qjgnwremgeyajzpwybvb.supabase.co';

  const SUPABASE_KEY =
    'sb_publishable_0NCWu1KZvXNN536AdoUpWw_o0c8Gb5V';

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ')
    ? auth.slice(7)
    : '';

  if (!token) {
    return res.status(401).json({
      error: 'Avval tizimga kiring.'
    });
  }

  if (!GEMINI_API_KEY) {
    return res.status(500).json({
      error: 'Server API kaliti sozlanmagan.'
    });
  }

  try {
    const check = await fetch(
      `${SUPABASE_URL}/auth/v1/user`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${token}`
        }
      }
    );

    if (!check.ok) {
      return res.status(401).json({
        error: 'Sessiya yaroqsiz. Qayta kiring.'
      });
    }

    const body = req.body || {};
    const prompt = typeof body.prompt === 'string'
      ? body.prompt.trim()
      : '';

    if (!prompt) {
      return res.status(400).json({
        error: 'Xabar bo‘sh.'
      });
    }

    if (prompt.length > 12000) {
      return res.status(413).json({
        error: 'Xabar juda uzun.'
      });
    }

    const history = Array.isArray(body.history)
      ? body.history.slice(-12)
      : [];

    const contents = [];

    for (const item of history) {
      if (
        !item ||
        !['user', 'model'].includes(item.role) ||
        !Array.isArray(item.parts)
      ) continue;

      const text = item.parts
        .filter(p => p && typeof p.text === 'string')
        .map(p => p.text)
        .join('\n');

      if (text) {
        contents.push({
          role: item.role,
          parts: [{ text: text.slice(0, 12000) }]
        });
      }
    }

    contents.push({
      role: 'user',
      parts: [{ text: prompt }]
    });

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048
          }
        })
      }
    );

    const result = await response.json();

    if (!response.ok) {
      return res.status(502).json({
        error: result.error?.message || 'Gemini xatosi.'
      });
    }

    const answer = result.candidates?.[0]?.content?.parts
      ?.map(p => p.text || '')
      .join('') || 'Javob olinmadi.';

    return res.status(200).json({ answer });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: 'Serverda xatolik yuz berdi.'
    });
  }
    }
