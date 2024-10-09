// CalendarComponent.js
import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import axios from 'axios';

const CalendarComponent = ({ onDateClick }) => {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const fetchEvents = async () => {
      const response = await axios.get('/api/calendar-events');
      setEvents(response.data.events);
    };
    fetchEvents();
  }, []);

  return (
    <FullCalendar
      plugins={[timeGridPlugin, interactionPlugin]}
      initialView="timeGridWeek"
      slotMinTime="09:00:00"
      slotMaxTime="22:00:00"
      events={events}
      selectable={true}
      select={(info) => onDateClick(info.startStr)}
      slotDuration="00:15:00"
      headerToolbar={{
        left: 'prev,next today',
        center: 'title',
        right: 'timeGridWeek,timeGridDay',
      }}
    />
  );
};

export default CalendarComponent;
