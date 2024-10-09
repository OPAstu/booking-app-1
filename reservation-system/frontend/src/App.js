// App.js
import React, { useState, useEffect } from 'react';
import CalendarComponent from './CalenderComponent';
import LoginModal from './LoginModal';
import BookingModal from './BookingModal';
import { auth } from './firebaseConfig';

const App = () => {
  const [user, setUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedStartTime, setSelectedStartTime] = useState(null);
  const [selectedEndTime, setSelectedEndTime] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return unsubscribe;
  }, []);

  const handleDateClick = (startTime) => {
    const endTime = new Date(new Date(startTime).getTime() + 15 * 60000); // 15分後の終了時刻
    setSelectedStartTime(startTime);
    setSelectedEndTime(endTime);
    setShowBookingModal(true);
  };

  const handleBookingConfirm = (start, end) => {
    if (user) {
      // ログイン済みの場合は直接予約完了
      bookReservation(start, end);
    } else {
      // ログインが必要な場合はログインモーダルを表示
      setShowBookingModal(false);
      setShowLoginModal(true);
    }
  };

  const bookReservation = (start, end) => {
    // 予約処理のロジック（例：バックエンドへのAPI呼び出し）
    console.log('予約が完了しました:', start, end);
    setShowBookingModal(false);
    alert(`予約が完了しました: ${start} - ${end}`);
  };

  const handleLoginSuccess = () => {
    setShowLoginModal(false);
    bookReservation(selectedStartTime, selectedEndTime);
  };

  return (
    <div>
      <CalendarComponent onDateClick={handleDateClick} />
      {showLoginModal && (
        <LoginModal 
          setShowLoginModal={setShowLoginModal} 
          onLogin={handleLoginSuccess}
        />
      )}
      {showBookingModal && (
        <BookingModal 
          startTime={selectedStartTime} 
          endTime={selectedEndTime} 
          onClose={() => setShowBookingModal(false)} 
          onSave={handleBookingConfirm}
        />
      )}
    </div>
  );
};

export default App;
