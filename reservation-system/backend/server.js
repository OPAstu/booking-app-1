// backend/server.js
const express = require('express');
const bodyParser = require('body-parser');
const { google } = require('googleapis');
const fs = require('fs');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 5000;

// GoogleカレンダーAPIの認証設定
const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const calendarId = process.env.GOOGLE_CALENDAR_ID;
console.log(calendarId);
const serviceAccountKey = JSON.parse(fs.readFileSync(process.env.GOOGLE_SERVICE_ACCOUNT_KEY));

// GoogleカレンダーAPIクライアントの作成
const auth = new google.auth.JWT(
  serviceAccountKey.client_email,
  null,
  serviceAccountKey.private_key,
  SCOPES
);
const calendar = google.calendar({ version: 'v3', auth });

// カレンダーのイベント取得エンドポイント
app.get('/api/calendar-events', async (req, res) => {
  try {
    const response = await calendar.events.list({
      calendarId: calendarId,
      timeMin: (new Date()).toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });
    res.status(200).json({ events: response.data.items });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Error fetching events' });
  }
});

// カレンダーに新規予約を追加するエンドポイント
app.post('/api/book', async (req, res) => {
  const { date, userId } = req.body;

  const event = {
    summary: `予約 by User ${userId}`,
    start: {
      dateTime: new Date(date).toISOString(),
      timeZone: 'Asia/Tokyo',
    },
    end: {
      dateTime: new Date(new Date(date).getTime() + 15 * 60 * 1000).toISOString(), // 15分後
      timeZone: 'Asia/Tokyo',
    },
  };

  try {
    await calendar.events.insert({
      calendarId: calendarId,
      resource: event,
    });
    res.status(200).json({ message: '予約が追加されました' });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Error creating event' });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
