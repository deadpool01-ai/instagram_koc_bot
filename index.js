const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = "kisiselkocbot_token_123";
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

app.get('/', (req, res) => {
  res.send('Instagram Koç Botu Aktif ve Çalışıyor!');
});

app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token === VERIFY_TOKEN) {
    console.log('WEBHOOK_VERIFIED');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.post('/webhook', async (req, res) => {
  const body = req.body;

  if (body.object === 'instagram') {
    body.entry.forEach(async (entry) => {
      const webhookEvent = entry.messaging?.[0];
      if (webhookEvent && webhookEvent.message && webhookEvent.message.text) {
        const senderId = webhookEvent.sender.id;
        const userMessage = webhookEvent.message.text;

        console.log(`📩 Yeni Mesaj (${senderId}): ${userMessage}`);

        try {
          const aiReply = await getGeminiResponse(userMessage);
          await sendInstagramMessage(senderId, aiReply);
        } catch (error) {
          console.error('❌ Bot Yanıt Verme Hatası:', error.response?.data || error.message);
        }
      }
    });

    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

async function getGeminiResponse(prompt) {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const response = await axios.post(url, {
      contents: [{
        parts: [{ text: `Sen profesyonel, motive edici ve disiplinli bir kişisel yaşam ve spor koçusun. Kullanıcının hedeflerine ulaşması için ona kısa, net ve nokta atışı tavsiyeler ver. Kullanıcıya Türkçe yanıt ver: ${prompt}` }]
      }]
    });

    return response.data.candidates[0].content.parts[0].text;
  } catch (err) {
    console.error('Gemini API Hatası:', err.message);
    return "Şu an bağlantıda bir aksaklık var kanka, birazdan tekrar dene!";
  }
}

async function sendInstagramMessage(recipientId, messageText) {
  const url = `https://graph.facebook.com/v18.0/me/messages`;
  await axios.post(url, {
    recipient: { id: recipientId },
    message: { text: messageText }
  }, {
    params: { access_token: PAGE_ACCESS_TOKEN }
  });
  console.log(`📤 Yanıt Gönderildi -> ${recipientId}`);
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
