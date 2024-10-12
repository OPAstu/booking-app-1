// BookingModal.js
import React, { useState, useEffect } from "react";
import "./BookingModal.css";

const BookingModal = ({
  selectedDate,
  startTime,
  endTime,
  onClose,
  onSave,
  nonWorkshopEvents,
  bookings,
  timeSlots,
}) => {
  useEffect(() => {
    if (Object.keys(timeSlots).length > 0) {
      console.log("Received updated timeSlots in BookingModal:", timeSlots);
    }
  }, [timeSlots]);
  useEffect(() => {
    console.log("Non-Workshop Events Loaded:", nonWorkshopEvents);
  }, [nonWorkshopEvents]);

  const [start, setStart] = useState(startTime);
  const [end, setEnd] = useState(endTime);

  const isValidTime = (time) => {
    if (!time) return true;
    const [hour, minute] = time.split(":").map(Number);
    return minute % 15 === 0;
  };

  const generateTimeOptions = () => {
    const times = [];
    for (let hour = 9; hour <= 21; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const time = `${String(hour).padStart(2, "0")}:${String(
          minute
        ).padStart(2, "0")}`;
        times.push(time);
      }
    }
    return times;
  };

  const timeOptions = generateTimeOptions();

  const isNonWorkshopEventConflict = (start, end) => {
    return nonWorkshopEvents.some((event) => {
      const eventStart = new Date(event.start.dateTime);
      const eventEnd = new Date(event.end.dateTime);

      // 15分のバッファを設定
      const bufferStart = new Date(eventStart.getTime() - 15 * 60000);
      const bufferEnd = new Date(eventEnd.getTime() + 15 * 60000);

      // バッファ範囲に少しでも重なる場合に `true` を返す
      const conflict = start < bufferEnd && end > bufferStart; // バッファ範囲内の重なり

      return conflict;
    });
  };

  const isFullyBooked = (start, end) => {
    const dateString = start.toISOString().split("T")[0];
    const timeSlotsForDay = timeSlots[dateString] || {};
    let current = new Date(start);

    while (current < end) {
      const timeString = current.toTimeString().substring(0, 5);
      const slotCount = timeSlotsForDay[timeString] || 0;

      if (slotCount >= 4) {
        return true;
      }
      current.setMinutes(current.getMinutes() + 15);
    }

    return false;
  };

  const handleTimeChange = (setter, timeValue) => {
    let bookingStart, bookingEnd;
    if (setter === setStart) {
      bookingStart = new Date(`${selectedDate}T${timeValue}`);
      bookingEnd = new Date(`${selectedDate}T${end}`);
    } else {
      bookingStart = new Date(`${selectedDate}T${start}`);
      bookingEnd = new Date(`${selectedDate}T${timeValue}`);
    }

    const validTime = isValidTime(timeValue);
    const nonWorkshopEventConflict = isNonWorkshopEventConflict(
      bookingStart,
      bookingEnd
    );
    const overlappingBookingConflict = isFullyBooked(bookingStart, bookingEnd);

    if (validTime && !nonWorkshopEventConflict && !overlappingBookingConflict) {
      setter(timeValue);
    } else {
      alert("選択した時間は使用されているため、選択できません。");
    }
  };

  const handleSave = () => {
    const bookingStart = new Date(`${selectedDate}T${start}`);
    const bookingEnd = new Date(`${selectedDate}T${end}`);
    const now = new Date();

    if (bookingStart < now) {
      alert("過去の日時には予約できません。");
      return;
    }

    if (bookingStart >= bookingEnd) {
      alert("終了時間は開始時間より後でなければなりません。");
      return;
    }

    const nonWorkshopConflict = isNonWorkshopEventConflict(
      bookingStart,
      bookingEnd
    );

    if (nonWorkshopConflict) {
      alert("選択した時間は利用できません。");
      return;
    }

    if (isFullyBooked(bookingStart, bookingEnd)) {
      alert("同時間帯での予約が最大人数に達しています。");
      return;
    }

    onSave(start, end);
  };

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
