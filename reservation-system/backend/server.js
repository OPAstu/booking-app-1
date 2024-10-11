// server.js
const express = require("express");
const bodyParser = require("body-parser");
const { google } = require("googleapis");
const fs = require("fs");
require("dotenv").config();

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 5101;

// GoogleカレンダーAPIの認証設定
const SCOPES = ["https://www.googleapis.com/auth/calendar"];
const calendarId = process.env.GOOGLE_CALENDAR_ID;
const serviceAccountKey = JSON.parse(
  fs.readFileSync(process.env.GOOGLE_SERVICE_ACCOUNT_KEY)
);

// GoogleカレンダーAPIクライアントの作成
const auth = new google.auth.JWT(
  serviceAccountKey.client_email,
  null,
  serviceAccountKey.private_key,
  SCOPES
);
const calendar = google.calendar({ version: "v3", auth });

// カレンダーのイベント取得エンドポイント
app.get("/api/calendar-events", async (req, res) => {
  try {
    const response = await calendar.events.list({
      calendarId: calendarId,
      timeMin: new Date().toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });
    res.status(200).json({ events: response.data.items });
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ error: "Error fetching events" });
  }
});
// 工房予約取得用エンドポイント
app.get("/api/workshop-bookings", async (req, res) => {
  try {
    const response = await calendar.events.list({
      calendarId: calendarId,
      timeMin: new Date().toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });

    // 工房予約のみをフィルタリング
    const workshopBookings = response.data.items.filter(
      (event) => event.summary === "工房予約"
    );
    res.status(200).json({ events: workshopBookings });
  } catch (error) {
    console.error("Error fetching workshop bookings:", error);
    res.status(500).json({ error: "Error fetching workshop bookings" });
  }
});

// カレンダーに新規予約を追加するエンドポイント
app.post("/api/book", async (req, res) => {
  const { startDate, endDate } = req.body;

  const event = {
    summary: "工房予約",
    start: {
      dateTime: startDate,
      timeZone: "Asia/Tokyo",
    },
    end: {
      dateTime: endDate,
      timeZone: "Asia/Tokyo",
    },
  };

  try {
    await calendar.events.insert({
      calendarId: calendarId,
      resource: event,
    });
    res.status(200).json({ message: "予約が追加されました" });
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).json({ error: error.message, details: error }); // 詳細なエラーメッセージを返す
  }
});

app.listen(PORT, () => console.log("Server running on port ", PORT));
