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
  const [nonWorkshopEvents, setNonWorkshopEvents] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [timeSlots, setTimeSlots] = useState({});

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return unsubscribe;
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await axios.get("/api/workshop-bookings");
      const events = response.data.events;
      const nonWorkshopEvents = events.filter(
        (event) => event.type === "NON_WORKSHOP"
      );
      const workshopBookings = events.filter(
        (event) => event.type === "WORKSHOP"
      );

      // 工房予約以外のイベントを取得し、バッファを考慮
      const nonClickableEvents = nonWorkshopEvents.map((event) => {
        const eventStart = new Date(event.start.dateTime);
        const eventEnd = new Date(event.end.dateTime);
        const bufferStart = new Date(eventStart.getTime() - 15 * 60000);
        const bufferEnd = new Date(eventEnd.getTime() + 15 * 60000);
        return {
          title: "予約不可",
          start: bufferStart.toISOString(),
          end: bufferEnd.toISOString(),
          className: "non-workshop-buffer",
        };
      });

      // 満員の時間帯を取得し、連続するスロットを結合
      const { timeSlots, fullyBookedEvents } =
        getFullyBookedEvents(workshopBookings);
      setTimeSlots(timeSlots);

      // 全てのイベントを統合（工房予約イベントは表示しない）
      const processedEvents = [...nonClickableEvents, ...fullyBookedEvents];
      setCalendarEvents(processedEvents);
      setNonWorkshopEvents(nonWorkshopEvents);
    } catch (error) {
      console.error("Error fetching workshop bookings:", error);
    }
  };

  useEffect(() => {
    fetchEvents();

    const socket = new WebSocket("ws://localhost:5101");

    socket.onopen = () => {
      console.log("WebSocket connection established");
    };

    socket.onmessage = (message) => {
      const parsedData = JSON.parse(message.data);
      if (parsedData.type === "NEW_BOOKING") {
        fetchEvents();
      }
    };

    socket.onclose = () => {
      console.log("WebSocket connection closed");
    };

    return () => {
      socket.close();
    };
  }, []);

  const getFullyBookedEvents = (workshopReservations) => {
    const timeSlots = {};
    const fullyBookedSlots = {};

    // 各時間帯の予約数をカウント
    workshopReservations.forEach((reservation) => {
      const start = new Date(reservation.start.dateTime);
      const end = new Date(reservation.end.dateTime);

      const dateString = start.toISOString().split("T")[0];
      if (!timeSlots[dateString]) {
        timeSlots[dateString] = {};
      }
      const timeSlotsForDay = timeSlots[dateString];

      let current = new Date(start);
      while (current < end) {
        const timeString = current.toTimeString().substring(0, 5);
        if (!timeSlotsForDay[timeString]) timeSlotsForDay[timeString] = 0;
        timeSlotsForDay[timeString]++;
        if (timeSlotsForDay[timeString] >= 4) {
          if (!fullyBookedSlots[dateString]) {
            fullyBookedSlots[dateString] = {};
          }
          fullyBookedSlots[dateString][timeString] = true;
        }
        current.setMinutes(current.getMinutes() + 15);
      }
    });

    // 満員の時間帯を連続するスロットごとに結合
    const fullyBookedEvents = [];

    Object.keys(fullyBookedSlots).forEach((date) => {
      const times = Object.keys(fullyBookedSlots[date]).sort();
      if (times.length === 0) return;

      let startTime = times[0];
      let endTime = times[0];

      for (let i = 1; i <= times.length; i++) {
        const currentTime = times[i];
        const previousTime = times[i - 1];

        if (
          currentTime &&
          getMinutesDifference(previousTime, currentTime) === 15
        ) {
          endTime = currentTime;
        } else {
          // イベントを追加
          const eventStart = new Date(`${date}T${startTime}`);
          const eventEnd = new Date(`${date}T${endTime}`);
          eventEnd.setMinutes(eventEnd.getMinutes() + 15);

          fullyBookedEvents.push({
            start: eventStart.toISOString(),
            end: eventEnd.toISOString(),
            title: "満員",
            className: "fully-booked",
          });

          // 次の区間の開始
          startTime = currentTime;
          endTime = currentTime;
        }
      }
    });

    return { timeSlots, fullyBookedEvents };
  };

  const getMinutesDifference = (time1, time2) => {
    const [hours1, minutes1] = time1.split(":").map(Number);
    const [hours2, minutes2] = time2.split(":").map(Number);
    const date1 = new Date(0, 0, 0, hours1, minutes1);
    const date2 = new Date(0, 0, 0, hours2, minutes2);
    return (date2 - date1) / 60000;
  };

  const handleDateClick = (info) => {
    const selectedDate = info.startStr.split("T")[0];
    const selectedStartTime = info.startStr.split("T")[1].slice(0, 5);
    const selectedEndTime = info.endStr.split("T")[1].slice(0, 5);

    setSelectedStartTime(selectedStartTime);
    setSelectedEndTime(selectedEndTime);
    setSelectedDate(selectedDate);
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

  const handleLoginSuccess = () => {
    setShowLoginModal(false);
    setShowBookingModal(true);
  };

  const bookReservation = async (start, end) => {
    try {
      // FirebaseのIDトークンを取得
      const idToken = await auth.currentUser.getIdToken(true);

      const response = await axios.post(
        "/api/book",
        {
          startDate: start,
          endDate: end,
        },
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        }
      );
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

  return (
    <div className="App">
      <CalendarComponent
        onDateClick={handleDateClick}
        events={calendarEvents}
      />
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
          onSave={handleBookingConfirm}
          nonWorkshopEvents={nonWorkshopEvents}
          bookings={calendarEvents}
          timeSlots={timeSlots}
        />
      )}
    </div>
  );
};

export default App;
