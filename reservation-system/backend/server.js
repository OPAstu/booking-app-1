// server.js
const express = require("express");
const bodyParser = require("body-parser");
const { google } = require("googleapis");
const fs = require("fs");
const cors = require("cors");
require("dotenv").config();
const admin = require("firebase-admin"); // Firebase Admin SDKをインポート

const app = express();
// CORS設定
const corsOptions = {
  origin: "http://localhost:3201",
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

// CORSミドルウェアを全てのルートに適用
app.use(cors(corsOptions));

// 必要に応じて `OPTIONS` リクエストを処理
app.options("/api/*", cors(corsOptions));

// ボディパーサーの設定
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

let latestReservationTime = new Date(0).toISOString(); // 初期値は十分古い日時

app.get("/api/check-updates", (req, res) => {
  const clientLastUpdate = req.query.lastUpdate;
  const interval = setInterval(() => {
    if (
      latestReservationTime &&
      new Date(latestReservationTime) > new Date(clientLastUpdate)
    ) {
      clearInterval(interval);
      if (!res.headersSent) {
        res.status(200).json({ hasUpdate: true, latestReservationTime });
      }
    }
  }, 1000);

  setTimeout(() => {
    clearInterval(interval);
    if (!res.headersSent) {
      res.status(200).json({ hasUpdate: false });
    }
  }, 30000);
});

app.get("/api/calendar-events", async (req, res) => {
  try {
    const response = await calendar.events.list({
      calendarId: calendarId,
      timeMin: new Date().toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });
    //console.log("Google Calendar API Response:", response.data);

    res.status(200).json({ events: response.data.items });
  } catch (error) {
    console.error("Error fetching events:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message, details: error });
    }
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
    // 最新の予約時間を更新
    latestReservationTime = new Date().toISOString();

    res.status(200).json({
      message: "予約が追加されました",
    });
  } catch (error) {
    console.error("Error creating event:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message, details: error });
    }
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
    if (!res.headersSent) {
      res.status(500).json({ error: error.message, details: error });
    }
  }
});

// ユーザーの予約リストを取得するエンドポイント
app.get("/api/user-reservations", async (req, res) => {
  const idToken = req.headers.authorization?.split("Bearer ")[1];

  if (!idToken) {
    return res.status(401).json({ error: "認証トークンがありません" });
  }

  try {
    // IDトークンを検証してユーザー情報を取得
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const userEmail = decodedToken.email;

    // Google Calendar APIからイベントを取得
    const response = await calendar.events.list({
      calendarId: calendarId,
      timeMin: new Date().toISOString(), // 現在から将来のイベントを取得
      singleEvents: true,
      orderBy: "startTime",
    });

    // ユーザーのメールアドレスが含まれている予約のみをフィルタリング
    const userReservations = response.data.items.filter((event) =>
      event.description.includes(userEmail)
    );

    res.status(200).json({ reservations: userReservations });
  } catch (error) {
    console.error("Error fetching user reservations:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message, details: error });
    }
  }
});

// 予約をキャンセルするエンドポイント
app.delete("/api/cancel-reservation/:reservationId", async (req, res) => {
  const { reservationId } = req.params;
  const idToken = req.headers.authorization?.split("Bearer ")[1];

  if (!idToken) {
    return res.status(401).json({ error: "認証トークンがありません" });
  }

  try {
    // IDトークンを検証してユーザー情報を取得
    const decodedToken = await admin.auth().verifyIdToken(idToken);

    // Google Calendar APIから指定された予約を削除
    await calendar.events.delete({
      calendarId: calendarId,
      eventId: reservationId,
    });

    res.status(200).json({ message: "予約がキャンセルされました。" });
  } catch (error) {
    console.error("Error cancelling reservation:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message, details: error });
    }
  }
});

// サーバーの起動
const server = app.listen(PORT, () =>
  console.log("Server running on port ", PORT)
);
