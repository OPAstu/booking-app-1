// CalendarComponent.js
import React, { useState } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import jaLocale from "@fullcalendar/core/locales/ja";

const CalendarComponent = ({ events, onDateClick }) => {
  const [hoveredEvent, setHoveredEvent] = useState(null);

  const handleEventMouseEnter = (info) => {
    const event = info.event;
    const startTime = event.start.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const endTime = event.end.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    setHoveredEvent({
      top: info.jsEvent.pageY,
      left: info.jsEvent.pageX,
      text: `${startTime} - ${endTime}`,
    });
  };

  const handleEventMouseLeave = () => {
    setHoveredEvent(null);
  };

  const selectAllow = (selectInfo) => {
    const selectedStart = selectInfo.start;
    const selectedEnd = selectInfo.end;
    const now = new Date();
    if (selectedStart < now) {
      return false;
    }
    return events.every((event) => {
      if (event.start && event.end) {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);

        if (
          event.className === "non-workshop-buffer" ||
          event.className === "fully-booked"
        ) {
          return selectedEnd <= eventStart || selectedStart >= eventEnd;
        }
      }
      return true;
    });
  };

  return (
    <div className="calendar-container">
      <FullCalendar
        plugins={[timeGridPlugin, interactionPlugin]}
        locale={jaLocale}
        initialView="timeGridWeek"
        slotMinTime="09:00:00"
        slotMaxTime="22:00:00"
        events={events}
        selectable={true}
        select={onDateClick}
        selectAllow={selectAllow}
        eventMouseEnter={handleEventMouseEnter}
        eventMouseLeave={handleEventMouseLeave}
        slotLabelFormat={{
          hour: "numeric",
          minute: "2-digit",
          omitZeroMinute: false,
          hour12: false,
        }}
        eventTimeFormat={{
          hour: "numeric",
          minute: "2-digit",
          hour12: false,
        }}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "timeGridWeek,timeGridDay",
        }}
        buttonText={{
          today: "今日",
          week: "週",
          day: "日",
        }}
        allDayText="終日"
      />
      {hoveredEvent && (
        <div
          className="tooltip"
          style={{ top: hoveredEvent.top, left: hoveredEvent.left }}
        >
          {hoveredEvent.text}
        </div>
      )}
    </div>
  );
};

export default CalendarComponent;
