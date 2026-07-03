import { useMemo } from "react";
import { authClient } from "@/lib/api/authClient";

export function useCalendarApi() {
  return useMemo(
    () => ({
      eventTypes: async () => {
        const response = await authClient.get("/calendar/event-types");
        return response.data;
      },
      get: async (sessionId) => {
        const response = await authClient.get(`/academic-sessions/${sessionId}/calendar`);
        return response.data;
      },
      generate: async (sessionId) => {
        const response = await authClient.post(`/academic-sessions/${sessionId}/calendar/generate`);
        return response.data;
      },
      createEvent: async (sessionId, payload) => {
        const response = await authClient.post(`/academic-sessions/${sessionId}/calendar/events`, payload);
        return response.data;
      },
      updateEvent: async (sessionId, eventId, payload) => {
        const response = await authClient.put(`/academic-sessions/${sessionId}/calendar/events/${eventId}`, payload);
        return response.data;
      },
      deleteEvent: async (sessionId, eventId) => {
        const response = await authClient.delete(`/academic-sessions/${sessionId}/calendar/events/${eventId}`);
        return response.data;
      },
      yearCalendar: async (yearId) => {
        const response = await authClient.get(`/academic-years/${yearId}/calendar`);
        return response.data;
      },
      syncHolidays: async (sessionId, year) => {
        const response = await authClient.post(`/academic-sessions/${sessionId}/calendar/sync-holidays`, { year });
        return response.data;
      },
    }),
    [],
  );
}
