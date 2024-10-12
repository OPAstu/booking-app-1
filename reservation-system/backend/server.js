// server.js
const express = require("express");
const bodyParser = require("body-parser");
const { google } = require("googleapis");
const fs = require("fs");
const WebSocket = require("ws");
require("dotenv").config();
const admin = require("firebase-admin"); // Firebase Admin SDKをインポート

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 5101;

// Firebase Admin SDKの初期化
const firebaseServiceAccount = JSON.parse(
  fs.readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
);

admin.initializeApp({
  credential: admin.credential.cert(firebaseServiceAccount),
});

// GoogleカレンダーAPIの認証設定
const SCOPES = ["https://www.googleapis.com/auth/calendar"];
const calendarId = process.env.GOOGLE_CALENDAR_ID;
const serviceAccountKey = JSON.parse(
  fs.readFileSync(process.env.GOOGLE_SERVICE_ACCOUNT_KEY)
);

const auth = new google.auth.JWT(
  serviceAccountKey.client_email,
  null,
  serviceAccountKey.private_key,
  SCOPES
);
const calendar = google.calendar({ version: "v3", auth });

// WebSocketサーバーの設定
const wss = new WebSocket.Server({ noServer: true });

// WebSocket接続時の処理
wss.on("connection", (ws) => {
  console.log("Client connected to WebSocket");

  ws.on("close", () => {
    console.log("Client disconnected from WebSocket");
  });
});

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

// カレンダーに新規予約を追加するエンドポイント
app.post("/api/book", async (req, res) => {
  const { startDate, endDate } = req.body;
  const idToken = req.headers.authorization?.split("Bearer ")[1];

  if (!idToken) {
    return res.status(401).json({ error: "認証トークンがありません" });
  }

  try {
    // IDトークンを検証してユーザー情報を取得
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const userEmail = decodedToken.email;

    const event = {
      summary: "工房予約",
      description: `予約者: ${userEmail}`, // メールアドレスを本文に追加
      start: {
        dateTime: startDate,
        timeZone: "Asia/Tokyo",
      },
      end: {
        dateTime: endDate,
        timeZone: "Asia/Tokyo",
      },
    };

    await calendar.events.insert({
      calendarId: calendarId,
      resource: event,
    });

    res.status(200).json({ message: "予約が追加されました" });

    // WebSocketでの通知
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(
          JSON.stringify({
            type: "NEW_BOOKING",
            data: { ...event, type: "WORKSHOP" },
          })
        );
      }
    });
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).json({ error: error.message, details: error });
  }
});

app.get("/api/workshop-bookings", async (req, res) => {
  try {
    const response = await calendar.events.list({
      calendarId: calendarId,
      timeMin: new Date().toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });

    // 工房予約とその他のイベントを分類
    const events = response.data.items.map((event) => {
      if (event.summary === "工房予約") {
        return { ...event, type: "WORKSHOP" };
      } else {
        return { ...event, type: "NON_WORKSHOP" };
      }
    });
    res.status(200).json({ events });
  } catch (error) {
    console.error("Error fetching workshop bookings:", error);
    res.status(500).json({ error: "Error fetching workshop bookings" });
  }
});

// サーバーの起動
const server = app.listen(PORT, () =>
  console.log("Server running on port ", PORT)
);

// WebSocket接続用のアップグレード処理
server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});
