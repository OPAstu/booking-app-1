import React, { useState, useEffect } from "react";
import "./styles.css";
import CalendarComponent from "./CalenderComponent";
import LoginModal from "./LoginModal";
import BookingModal from "./BookingModal";
import ListModal from "./ListModal";
import { auth } from "./firebaseConfig";
import axios from "axios";
import ListIcon from "@mui/icons-material/List";

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
  const [lastUpdate, setLastUpdate] = useState(new Date().toISOString());
  const [showListModal, setShowListModal] = useState(false);
  const [reservations, setReservations] = useState([]);

  // カレンダーのイベントを取得する関数
  const fetchEvents = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/calendar-events`
      );

      const events = response.data.events;

      // 非ワークショップのイベントをフィルタリング
      const nonWorkshopEvents = events.filter(
        (event) => event.summary !== "工房予約"
      );

      // 工房予約のイベントをフィルタリング
      const workshopBookings = events.filter(
        (event) => event.summary === "工房予約"
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

      // 非ワークショップイベントと満員イベントを統合
      const processedEvents = [...nonClickableEvents, ...fullyBookedEvents];
      setCalendarEvents(processedEvents);
      setNonWorkshopEvents(nonWorkshopEvents);
    } catch (error) {
      console.error("Error fetching workshop bookings:", error);
    }
  };

  // 更新を確認する関数
  const checkUpdates = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/check-updates`,
        {
          params: { lastUpdate },
        }
      );

      if (response.data.hasUpdate) {
        // 更新があればイベントを再取得
        fetchEvents();
        setLastUpdate(new Date().toISOString());
      }
    } catch (error) {
      console.error("Error checking updates:", error);
    }
  };

  useEffect(() => {
    // 初回レンダリング時にイベントを取得
    fetchEvents();

    // 30秒ごとに更新を確認
    const interval = setInterval(checkUpdates, 30000);
    return () => clearInterval(interval);
  }, [lastUpdate]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return unsubscribe;
  }, []);

  const getFullyBookedEvents = (workshopReservations) => {
    const timeSlots = {};
    const fullyBookedSlots = {};

    // 各時間帯の予約数をカウント
    workshopReservations.forEach((reservation) => {
      const start = new Date(reservation.start.dateTime);
      const end = new Date(reservation.end.dateTime);
      const dateString = start.toLocaleDateString("ja-JP", {
        timeZone: "Asia/Tokyo",
      });
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
          const formattedDate = date.replace(/\//g, "-");
          const eventStart = new Date(`${formattedDate}T${startTime}:00`);
          const eventEnd = new Date(`${formattedDate}T${endTime}:00`);
          eventEnd.setMinutes(eventEnd.getMinutes() + 15);

          fullyBookedEvents.push({
            start: eventStart.toISOString(),
            end: eventEnd.toISOString(),
            title: "満員",
            className: "fully-booked",
          });

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
      const idToken = await auth.currentUser.getIdToken(true);

      const response = await axios.post(
        `${process.env.REACT_APP_API_BASE_URL}/book`,
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
      fetchEvents();
    } catch (error) {
      console.error("予約エラー:", error);
      alert(
        `予約に失敗しました。エラー: ${
          error.response?.data?.error || "詳細不明"
        }`
      );
    }
  };

  // ユーザーの予約を取得する関数
  const fetchUserReservations = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_BASE_URL}/calendar-events`
      );
      const events = response.data.events;

      // ユーザーのメールアドレスが含まれている予約をフィルタリング
      const userReservations = events.filter(
        (event) => event.description && event.description.includes(user?.email) // descriptionが存在するかチェック
      );

      setReservations(userReservations); // 予約を設定
    } catch (error) {
      console.error("Error fetching user reservations:", error);
    }
  };
  const handleListIconClick = () => {
    if (user && user.email) {
      // ユーザーがログインしていて、メールアドレスが取得できている場合
      fetchUserReservations(); // 予約を取得
      setShowListModal(true); // モーダルを表示
    } else {
      setShowLoginModal(true); // ログインしていない、またはメールアドレスが取得できていない場合はログインモーダルを表示
    }
  };

  // Function to handle cancelling a reservation
  const cancelReservation = async (reservationId) => {
    try {
      const idToken = await auth.currentUser.getIdToken(true);
      await axios.delete(
        `${process.env.REACT_APP_API_BASE_URL}/cancel-reservation/${reservationId}`,
        {
          headers: { Authorization: `Bearer ${idToken}` },
        }
      );
      // After cancellation, refetch reservations
      fetchUserReservations();
      alert("予約をキャンセルしました。");
    } catch (error) {
      console.error(
        "Error cancelling reservation:",
        error.response?.data || error.message
      );
      alert("キャンセルに失敗しました。");
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return unsubscribe;
  }, []);

  return (
    <div className="App">
      <div>
        <p>カレンダー内の時間をクリックすると、ログイン後に予約ができます。</p>
        <p>
          ログイン後であれば右下のリストアイコンから予約の確認とキャンセルができます。
        </p>
      </div>
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
      {showListModal && (
        <ListModal
          reservations={reservations} // 取得した予約を渡す
          onClose={() => setShowListModal(false)} // モーダルを閉じる処理
          onCancel={cancelReservation} // キャンセル処理
        />
      )}
      <div className="fixed-icon">
        <ListIcon fontSize="large" onClick={handleListIconClick} />
      </div>
    </div>
  );
};

export default App;
