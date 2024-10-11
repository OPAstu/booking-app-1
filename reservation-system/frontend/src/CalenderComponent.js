import React, { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import axios from "axios";
import "./CalendarComponent.css";

const CalendarComponent = ({ onDateClick }) => {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await axios.get("/api/calendar-events");
        const now = new Date();

        const processedEvents = response.data.events.map((event) => {
          const eventStart = new Date(event.start.dateTime);
          const eventEnd = new Date(event.end.dateTime);
          const isOPA = event.summary === "OPA";
          const isPastEvent = eventStart < now;

          return {
            ...event,
            start: eventStart,
            end: eventEnd,
            className: isOPA ? "opa-event" : isPastEvent ? "past-event" : "",
          };
        });

        setEvents(processedEvents);
      } catch (error) {
        console.error("Error fetching events:", error);
      }
    };
    fetchEvents();
  }, []);

  const handleDateClick = (info) => {
    onDateClick(info.startStr, events);
  };

  return (
    <FullCalendar
      plugins={[timeGridPlugin, interactionPlugin]}
      initialView="timeGridWeek"
      slotMinTime="09:00:00"
      slotMaxTime="22:00:00"
      events={events}
      selectable={true}
      select={handleDateClick}
      slotDuration="00:15:00"
      headerToolbar={{
        left: "prev,next today",
        center: "title",
        right: "timeGridWeek,timeGridDay",
      }}
    />
  );
};

export default CalendarComponent;
