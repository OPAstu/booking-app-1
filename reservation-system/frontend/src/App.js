// App.js
import React, { useState, useEffect } from "react";
import "./styles.css";
import CalendarComponent from "./CalenderComponent";
import LoginModal from "./LoginModal";
import BookingModal from "./BookingModal";
import { auth } from "./firebaseConfig";
import axios from "axios";

const App = () => {
  const [user, setUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedStartTime, setSelectedStartTime] = useState(null);
  const [selectedEndTime, setSelectedEndTime] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [opaEvents, setOpaEvents] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]); // 追加

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return unsubscribe;
  }, []);

  // カレンダーイベントの取得
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await axios.get("/api/calendar-events");
        setCalendarEvents(response.data.events); // カレンダーイベントをセット
      } catch (error) {
        console.error("Error fetching calendar events:", error);
      }
    };
    fetchEvents();
  }, []);

  const handleDateClick = (startTime, opaEvents) => {
    const startDateTime = new Date(startTime);
    const endTime = new Date(startDateTime.getTime() + 15 * 60000); // 15分後の終了時刻
    const dateOnly = startDateTime.toISOString().split("T")[0];

    setSelectedStartTime(startDateTime.toTimeString().slice(0, 5));
    setSelectedEndTime(endTime.toTimeString().slice(0, 5));
    setSelectedDate(dateOnly);
    setOpaEvents(opaEvents);
    setShowBookingModal(true);
  };

  const handleBookingConfirm = async (start, end) => {
    if (user) {
      const startDate = new Date(`${selectedDate}T${start}`);
      const endDate = new Date(`${selectedDate}T${end}`);
      const startISO = startDate.toISOString();
      const endISO = endDate.toISOString();
      await bookReservation(startISO, endISO);
    } else {
      setShowBookingModal(false);
      setShowLoginModal(true);
    }
  };

  const bookReservation = async (start, end) => {
    try {
      const response = await axios.post("/api/book", {
        startDate: start,
        endDate: end,
      });
      setShowBookingModal(false);
      alert(response.data.message);
    } catch (error) {
      console.error("予約エラー:", error);
      alert(
        `予約に失敗しました。エラー: ${
          error.response?.data?.error || "詳細不明"
        }`
      );
    }
  };

  const handleLoginSuccess = () => {
    setShowLoginModal(false);
    bookReservation(selectedStartTime, selectedEndTime);
  };

  return (
    <div className="App">
      <CalendarComponent onDateClick={handleDateClick} />
      {showLoginModal && (
        <LoginModal
          setShowLoginModal={setShowLoginModal}
          onLogin={handleLoginSuccess}
        />
      )}
      {showBookingModal && (
        <BookingModal
          selectedDate={selectedDate}
          startTime={selectedStartTime}
          endTime={selectedEndTime}
          onClose={() => setShowBookingModal(false)}
          onSave={(start, end) => handleBookingConfirm(start, end)}
          opaEvents={opaEvents}
          bookings={calendarEvents} // 取得したカレンダーイベントを渡す
        />
      )}
    </div>
  );
};

export default App;
