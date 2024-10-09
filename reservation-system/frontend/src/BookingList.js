// BookingModal.js
import React, { useState } from 'react';

const BookingModal = ({ startTime, endTime, onClose, onSave }) => {
  const [start, setStart] = useState(startTime);
  const [end, setEnd] = useState(endTime);

  const handleSave = () => {
    onSave(start, end);
  };

  const handleTimeChange = (setter) => (event) => {
    const time = event.target.value;
    const minutes = parseInt(time.split(':')[1]);
    if (minutes % 15 === 0) {
      setter(time);
    } else {
      alert('15分単位でのみ選択できます');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>予約時間設定</h3>
        <label>開始時間:</label>
        <input type="time" value={start} onChange={handleTimeChange(setStart)} />
        <label>終了時間:</label>
        <input type="time" value={end} onChange={handleTimeChange(setEnd)} />
        <button onClick={handleSave}>予約</button>
        <button onClick={onClose}>キャンセル</button>
      </div>
    </div>
  );
};

export default BookingModal;
