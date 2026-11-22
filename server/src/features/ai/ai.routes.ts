import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/auth';
import { Message } from '../messages/message.model';
import { Room } from '../rooms/room.model';

const router = Router();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

router.post('/:roomId/summarize', requireAuth, async (req, res) => {
  try {
    const room = await Room.findById(req.params.roomId);
    if (!room) throw new Error('room not found');
    if (!room.members.some((m) => m.user.toString() === req.user.id)) throw new Error('not a member');

    const messages = await Message.find({ room: room.id, deleted: false, parentMessage: null })
      .sort({ createdAt: -1 })
      .limit(200)
      .populate('sender', 'username');

    if (!GEMINI_API_KEY) {
      if (messages.length === 0) {
        return res.json({ summary: 'No messages to summarize yet.' });
      }
      const participants = Array.from(new Set(messages.map((m: any) => m.sender?.username).filter(Boolean)));
      return res.json({
        summary: `Summary of recent conversation (${messages.length} messages) involving ${participants.join(', ') || 'members'}. (Configure GEMINI_API_KEY for generative AI summaries).`,
      });
    }

    const chatLog = messages.reverse().map(
      (m: any) => `${m.sender?.username || 'unknown'}: ${m.text}`
    ).join('\n');

    const prompt = `Summarize the following chat conversation concisely. Highlight key topics, decisions, and action items. Be brief (under 200 words).\n\nChat log:\n${chatLog || '(empty chat)'}`;

    const response = await fetch(`${GEMINI_BASE}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || 'Gemini API error');

    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No summary available.';
    res.json({ summary });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:roomId/suggest', requireAuth, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) throw new Error('message required');

    const room = await Room.findById(req.params.roomId);
    if (!room) throw new Error('room not found');
    if (!room.members.some((m) => m.user.toString() === req.user.id)) throw new Error('not a member');

    const recent = await Message.find({ room: room.id, deleted: false, parentMessage: null })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('sender', 'username');

    if (!GEMINI_API_KEY) {
      return res.json({
        suggestions: [
          `Thanks, I will look into "${message.slice(0, 30)}" shortly!`,
          `Could you provide a few more details?`,
          `Sounds good! Let's proceed with that.`,
        ],
      });
    }

    const context = recent.reverse().map(
      (m: any) => `${m.sender?.username || 'unknown'}: ${m.text}`
    ).join('\n');

    const prompt = `You are an AI assistant inside a group chat. Given the recent conversation context and the user's incomplete message, suggest 3 short completion options (each under 30 words). Return ONLY a JSON array of 3 strings, nothing else.\n\nRecent context:\n${context}\n\nUser's message: ${message}`;

    const response = await fetch(`${GEMINI_BASE}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message || 'Gemini API error');

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
    let suggestions: string[] = [];
    try {
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        suggestions = JSON.parse(match[0]);
      } else {
        suggestions = JSON.parse(text.replace(/```json\n?|```/g, '').trim());
      }
    } catch {
      suggestions = text
        .split('\n')
        .map((s: string) => s.replace(/^[-*\d.]+\s*/, '').trim())
        .filter((s: string) => s.length > 0)
        .slice(0, 3);
    }
    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      suggestions = ['Sounds good!', 'Understood, on it.', 'Let me check that.'];
    }

    res.json({ suggestions });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
