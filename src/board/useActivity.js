// Live class activity state for one room, kept in step with the server. The server decides what each
// person may see, so this just shows what arrives: the host gets every answer as it is sent, a student
// gets the question and their own answer (and the results once the host reveals them).
import { useCallback, useEffect, useRef, useState } from "react";
import { upsertResponse } from "./activityLogic.js";

export function useActivity(socket, roomId, onError) {
  const [state, setState] = useState({ role: null, activity: null });
  const errorRef = useRef(onError);
  errorRef.current = onError;

  useEffect(() => {
    if (!socket) return undefined;
    const onState = (payload) => setState({ role: payload?.role ?? null, activity: payload?.activity ?? null });
    const onResponse = ({ activityId, response }) => setState((current) => (
      current.activity && current.activity.id === activityId
        ? { ...current, activity: { ...current.activity, responses: upsertResponse(current.activity.responses || [], response) } }
        : current
    ));
    const onAck = ({ activityId, mine }) => setState((current) => (
      current.activity && current.activity.id === activityId ? { ...current, activity: { ...current.activity, mine } } : current
    ));
    const onProblem = (payload) => errorRef.current?.(payload?.message || "Something went wrong.");
    socket.on("activity-state", onState);
    socket.on("activity-response", onResponse);
    socket.on("activity-ack", onAck);
    socket.on("activity-error", onProblem);
    return () => {
      socket.off("activity-state", onState);
      socket.off("activity-response", onResponse);
      socket.off("activity-ack", onAck);
      socket.off("activity-error", onProblem);
    };
  }, [socket]);

  const send = useCallback((event, payload = {}) => socket?.emit(event, { roomId, ...payload }), [socket, roomId]);
  return {
    ...state,
    start: (spec) => send("activity-start", { spec }),
    close: () => send("activity-close"),
    reveal: () => send("activity-reveal"),
    end: () => send("activity-end"),
    spotlight: (key, showName) => send("activity-spotlight", { key, showName }),
    clearSpotlight: () => send("activity-spotlight-clear"),
    respond: (activityId, value) => send("activity-respond", { activityId, value }),
  };
}
