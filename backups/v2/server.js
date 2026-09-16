import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Serve static web app files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Environment variables check
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.warn('⚠️ Warning: OPENAI_API_KEY is not set in .env file. AI responses will return fallback message.');
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY || 'dummy_key' });

// In-Memory User Conversation Store
const userConversations = new Map();

// ==========================================================================
// LifeOS Core System Prompt (Reflective Facilitator & Absolute Neutrality)
// ==========================================================================
const LIFEOS_SYSTEM_PROMPT = `คุณคือ LifeOS Personal AI - ผู้ช่วยสะท้อนและแกะปมความคิด (Reflective Facilitator & Self Architecture Engine)
คุณมีฐานองค์ความรู้และทักษะปฏิบัติตามมาตรฐาน "นักจิตบำบัดระดับสากล" (Silent Expertise) แต่แสดงออกด้วยภาษามนุษย์ธรรมดา เรียบง่าย กระชับ 100%

[กฎเหล็กและสถาปัตยกรรมการโต้ตอบ]
1. **Absolute Neutrality & Zero Judgment:** เป็นกลาง 100% ห้ามตัดสิน ห้ามเข้าข้าง ห้ามใช้คำตัดสินเชิงอารมณ์แทนผู้ใช้ (เช่น ห้ามใช้คำว่า "ใจร้าย", "ไม่ดี", "เฮงซวย", "แย่มาก") สะท้อนเฉพาะข้อเท็จจริงและปรากฏการณ์ที่เกิดขึ้นจริง
2. **De-AIification & Zero Fluff:** ห้ามใช้ภาษาหุ่นยนต์ ห้ามเกริ่นคำทักทายประดิดประดอย (เช่น ห้ามพูดว่า "ยินดีที่ได้รู้จัก", "ฟังดูเหมือน...") สั้น กระชับ ตรงประเด็น
3. **Non-Directive Glass Mirror:** ไม่ชี้นำ ไม่ยัดเยียดคำแนะนำ ไม่สั่งสอน แต่ใช้การตั้งคำถามและสะท้อนคำเดิมของผู้ใช้ (Echoing & Reframing) เพื่อให้ผู้ใช้ตกผลึก Insight ด้วยตนเอง
4. **Somatic & Emotional Grounding:** หากผู้ใช้มีอาการล้าหรือคิดไม่ออก ให้ดึงความรู้สึกกลับมาที่การรับรู้ทางร่างกาย (Somatic Sensing) อย่างนุ่มนวล
5. **Strict Fact-Matching:** อ้างอิงเฉพาะข้อเท็จจริงที่ผู้ใช้พูดจริง ห้ามด่วนสรุปเกินความจริง หรือใช้คำสวยหรูที่ผู้ใช้ไม่ได้รู้สึกจริง`;

// ==========================================
// 1. Web Chat API Endpoint (POST /api/chat)
// ==========================================
app.post('/api/chat', async (req, res) => {
  try {
    const { message, userUid = 'guest_session', userName = 'บุ๋มจิ' } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Message content is required.' });
    }

    console.log(`📩 Received message from user [${userName} / ${userUid}]: ${message}`);

    // Retrieve or initialize conversation history for this user
    if (!userConversations.has(userUid)) {
      userConversations.set(userUid, [
        {
          role: 'system',
          content: `${LIFEOS_SYSTEM_PROMPT}\n\nคุณกำลังสนทนากับคุณ ${userName}`,
        },
      ]);
    }

    const history = userConversations.get(userUid);
    history.push({ role: 'user', content: message });

    // Limit conversation history buffer to last 14 messages to manage token limits
    if (history.length > 15) {
      history.splice(1, history.length - 15);
    }

    // Fallback if OPENAI_API_KEY is missing or invalid
    if (!OPENAI_API_KEY || OPENAI_API_KEY === 'dummy_key') {
      const fallbackReply = `[LifeOS Demo Mode] ได้รับข้อความจากคุณ ${userName}: "${message}"\n\n(ระบบรันในโหมด Demo - กรุณาตั้งค่า OPENAI_API_KEY ในไฟล์ .env เพื่อใช้บริการ AI เต็มรูปแบบครับ)`;
      history.push({ role: 'assistant', content: fallbackReply });
      return res.json({ reply: fallbackReply });
    }

    // Call OpenAI ChatGPT Engine
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: history,
      max_tokens: 500,
      temperature: 0.6,
    });

    const aiReply = completion.choices[0].message.content;
    console.log(`🤖 AI reply to [${userUid}]: ${aiReply}`);

    // Save AI response into history
    history.push({ role: 'assistant', content: aiReply });

    return res.json({ reply: aiReply });

  } catch (error) {
    console.error('❌ Error processing chat request:', error.message || error);
    return res.status(500).json({
      error: 'Failed to generate AI response.',
      reply: 'ขออภัยครับ เกิดข้อผิดพลาดชั่วคราวในการประมวลผลระบบ AI'
    });
  }
});

// ==========================================
// 2. Get User Chat History (GET /api/history/:uid)
// ==========================================
app.get('/api/history/:uid', (req, res) => {
  const { uid } = req.params;
  const history = userConversations.get(uid) || [];
  res.json({ history });
});

// ==========================================
// 3. Clear User Chat History (DELETE /api/history/:uid)
// ==========================================
app.delete('/api/history/:uid', (req, res) => {
  const { uid } = req.params;
  userConversations.delete(uid);
  res.json({ status: 'cleared' });
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`🚀 LifeOS Web Chat Application Server running at http://localhost:${PORT}`);
});
