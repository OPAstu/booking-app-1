// BookingModal.js
import React, { useState } from "react";
import "./BookingModal.css";

const BookingModal = ({
  selectedDate,
  startTime,
  endTime,
  onClose,
  onSave,
  opaEvents,
  bookings, // カレンダーイベントを受け取る
}) => {
  const [start, setStart] = useState(startTime);
  const [end, setEnd] = useState(endTime);

  const isValidTime = (time) => {
    if (!time) return true;
    const [hour, minute] = time.split(":").map(Number);
    return minute % 15 === 0;
  };

  const handleTimeChange = (setter, timeValue) => {
    const bookingStart = new Date(`${selectedDate}T${start}`);
    const bookingEnd = new Date(`${selectedDate}T${timeValue}`);

    const validTime = isValidTime(timeValue);
    const opaEventConflict = isOPAEvent(bookingStart, bookingEnd);

    if (validTime && !opaEventConflict) {
      setter(timeValue);
    } else {
      alert("選択した時間は使用されているため、選択できません。");
    }
  };

  const isPastDate = (startDate) => {
    const now = new Date();
    return startDate < now;
  };

  const isOPAEvent = (start, end) => {
    return opaEvents.some((event) => {
      const eventStart = new Date(event.start.dateTime);
      const eventEnd = new Date(event.end.dateTime);

      if (!eventStart || !eventEnd) return false;

      const bufferStart = new Date(eventStart.getTime() - 15 * 60000);
      const bufferEnd = new Date(eventEnd.getTime() + 15 * 60000);

      const overlaps =
        (start >= bufferStart && start < bufferEnd) ||
        (end > bufferStart && end <= bufferEnd) ||
        (start <= bufferStart && end >= bufferEnd);

      return overlaps;
    });
  };

  const isOverlappingBooking = (start, end) => {
    const maxBookings = 4;

    const overlappingCount = bookings.filter((booking) => {
      const bookingStart = new Date(booking.start.dateTime);
      const bookingEnd = new Date(booking.end.dateTime);

      if (!bookingStart || !bookingEnd) return false;

      const overlaps =
        (start >= bookingStart && start < bookingEnd) ||
        (end > bookingStart && end <= bookingEnd) ||
        (start <= bookingStart && end >= bookingEnd);

      return overlaps;
    }).length;

    return overlappingCount >= maxBookings;
  };

  const handleSave = () => {
    const bookingStart = new Date(`${selectedDate}T${start}`);
    const bookingEnd = new Date(`${selectedDate}T${end}`);

    if (isPastDate(bookingStart)) {
      alert("過去の日時には予約できません。");
      return;
    }

    if (bookingStart >= bookingEnd) {
      alert("終了時間は開始時間より後でなければなりません。");
      return;
    }

    if (isOPAEvent(bookingStart, bookingEnd)) {
      alert("選択した時間にはOPAイベントが含まれているため、予約できません。");
      return;
    }

    if (isOverlappingBooking(bookingStart, bookingEnd)) {
      alert("同時間帯での予約が最大人数に達しています。");
      return;
    }

    onSave(start, end);
  };

  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        // 修正点
        const time = `${String(hour).padStart(2, "0")}:${String(
          minute
        ).padStart(2, "0")}`;
        times.push(time);
      }
    }
    return times;
  };

  const timeOptions = generateTimeOptions();

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>予約時間設定</h3>
        <p className="modal-date">選択した日付: {selectedDate}</p>
        <label>開始時間:</label>
        <select
          value={start}
          onChange={(e) => handleTimeChange(setStart, e.target.value)}
          className="time-select"
        >
          {timeOptions.map((time) => (
            <option key={`start-${time}`} value={time}>
              {time}
            </option>
          ))}
        </select>
        <label>終了時間:</label>
        <select
          value={end}
          onChange={(e) => handleTimeChange(setEnd, e.target.value)}
          className="time-select"
        >
          {timeOptions.map((time) => (
            <option key={`end-${time}`} value={time}>
              {time}
            </option>
          ))}
        </select>
        <div className="modal-buttons">
          <button className="modal-button confirm" onClick={handleSave}>
            予約
          </button>
          <button className="modal-button cancel" onClick={onClose}>
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookingModal;
