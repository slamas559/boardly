// RoomShell: everything around the board and document views: top bar, participants, Q&A, voice.
// Hosts get controls; listeners get a clean, view-only layout that follows the presenter.
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  ArrowLeft, Check, CircleHelp, Expand, FileText, Link2, ListChecks, LogOut, MoreHorizontal, PenLine, Shrink, Square, Users, X,
} from "lucide-react";
import { useSocket } from "../context/SocketContext";
import api from "../utils/api";
import BoardWorkspace from "../board/BoardWorkspace.jsx";
import PDFWorkspace from "../board/PDFWorkspace.jsx";
import { QaPanel, useQaManager } from "../components/layout/QaManager";
import VoiceBroadcast from "../components/layout/VoiceBroadcast";
import SessionRecorder from "../components/layout/SessionRecorder.jsx";
import InactiveRoom from "../components/layout/InactiveRoom";
import Logo from "../ui/Logo.jsx";
import ActivityHost from "../board/ActivityHost.jsx";
import ActivityStudent, { Spotlight } from "../board/ActivityStudent.jsx";
import { useActivity } from "../board/useActivity.js";
import { getClientId } from "../utils/clientId.js";
import { useFullscreen } from "../utils/useFullscreen.js";

function useOutsideClose(open, onClose) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const h = (e) => { if (!ref.current?.contains(e.target)) onClose(); };
    const k = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("pointerdown", h);
    document.addEventListener("keydown", k);
    return () => { document.removeEventListener("pointerdown", h); document.removeEventListener("keydown", k); };
  }, [open, onClose]);
  return ref;
}

const IconButton = ({ icon: Icon, label, onClick, active, badge, className = "" }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    aria-expanded={active}
    className={`relative flex h-9 w-9 items-center justify-center rounded-md text-gray-700 hover:bg-sunken ${active ? "bg-sunken" : ""} ${className}`}
  >
    <Icon size={18} strokeWidth={1.8} />
    {badge > 0 && (
      <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-sm bg-accent px-1 text-[10px] font-semibold leading-none text-white">{badge}</span>
    )}
  </button>
);

export default function RoomShell({ room, isTutor }) {
  const { socket } = useSocket();
  const navigate = useNavigate();
  const isRoomActive = room.status === "active";

  const [view, setView] = useState(room.currentView || "whiteboard");
  const [roomState, setRoomState] = useState(null);
  const [isHost, setIsHost] = useState(isTutor);
  const [stats, setStats] = useState({ students: 0, userList: [] });
  const [activityOpen, setActivityOpen] = useState(false);
  const boardApiRef = useRef(null); // lets the class panel put results onto the board
  const activity = useActivity(socket, room._id, useCallback((message) => toast.error(message), []));
  const [profile, setProfile] = useState(null);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [connected, setConnected] = useState(true);
  const [isRecording, setIsRecording] = useState(false);

  const fullscreen = useFullscreen();
  const qa = useQaManager(room, socket, isTutor);
  const unanswered = qa.studentQuestions.filter((q) => !q.answered).length;

  const peopleRef = useOutsideClose(peopleOpen, useCallback(() => setPeopleOpen(false), []));
  const menuRef = useOutsideClose(menuOpen, useCallback(() => setMenuOpen(false), []));

  /* who am I (for the participant list) */
  useEffect(() => {
    api.get("/auth/profile").then((r) => setProfile(r.data)).catch(() => setProfile({ _id: "", name: "Guest" }));
  }, []);

  /* join the room (again after every reconnect) and receive the live state */
  useEffect(() => {
    if (!socket || !isRoomActive || !profile) return undefined;
    const join = () => {
      socket.emit("join-room", { roomId: room._id, user: { id: profile._id || "", name: profile.name || "Guest", isTutor, clientId: getClientId() } });
    };
    const onState = (s) => { setRoomState(s); setIsHost(Boolean(s.isHost)); setIsRecording(Boolean(s.isRecording)); };
    const onConnect = () => { setConnected(true); join(); };
    const onDisconnect = () => setConnected(false);
    const onView = (v) => setView(v);
    const onStats = (s) => setStats(s);
    const onRecording = ({ active }) => setIsRecording(Boolean(active));

    socket.on("room-state", onState);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("change-view", onView);
    socket.on("room-stats-update", onStats);
    socket.on("recording-state", onRecording);
    if (socket.connected) join();
    return () => {
      socket.off("room-state", onState);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("change-view", onView);
      socket.off("room-stats-update", onStats);
      socket.off("recording-state", onRecording);
    };
  }, [socket, room._id, isRoomActive, profile, isTutor]);

  const changeView = (v) => {
    if (!isHost) return;
    setView(v);
    socket.emit("change-view", { roomId: room._id, view: v });
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/room/${room.code}`);
      toast.success("Invite link copied");
    } catch {
      toast.error("Could not copy. Select the link manually.");
    }
    setMenuOpen(false);
  };

  const setStatus = async (mode) => {
    try {
      await api.put(`/rooms/end-room/${room._id}`, { mode });
      if (mode === "inactive") navigate("/lobby");
      else window.location.reload();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not update the session. Try again.");
    }
  };

  if (!isRoomActive) {
    return <InactiveRoom room={room} isTutor={isTutor} onNavigateToLobby={() => navigate("/lobby")} onActivateRoom={() => setStatus("active")} />;
  }

  const listeners = stats.userList || [];
  const leave = () => navigate(isTutor ? "/lobby" : "/dashboard");

  return (
    <div className="room-root flex w-full flex-col bg-paper">
      <header className="relative z-30 flex h-12 shrink-0 items-center gap-2 border-b border-line bg-surface px-2 safe-top sm:px-3">
        <button type="button" onClick={leave} aria-label="Leave room" className="flex h-9 w-9 items-center justify-center rounded-md text-gray-700 hover:bg-sunken">
          <ArrowLeft size={18} />
        </button>
        <Logo className="hidden h-6 w-6 sm:block" />
        <div className="min-w-0 flex-1 sm:flex-none sm:max-w-[26ch]">
          <h1 className="truncate text-sm font-semibold leading-tight">{room.topic}</h1>
          <p className="truncate text-[11px] leading-tight text-muted">
            {isHost ? "You are presenting" : `Hosted by ${room.creator?.name || "the host"}`}
          </p>
        </div>

        {/* View switcher: host controls what everyone sees */}
        <div className="mx-auto hidden md:block">
          {isHost ? (
            <div role="tablist" aria-label="Room view" className="flex rounded-md border border-line p-0.5">
              {[["whiteboard", "Board", PenLine], ["pdf", "Document", FileText]].map(([id, label, Icon]) => (
                <button
                  key={id} role="tab" aria-selected={view === id} type="button" onClick={() => changeView(id)}
                  className={`flex h-7 items-center gap-1.5 rounded-[4px] px-3 text-sm ${view === id ? "bg-ink text-paper" : "text-gray-700 hover:bg-sunken"}`}
                >
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-sm text-muted">
              {view === "pdf" ? <FileText size={14} /> : <PenLine size={14} />} Presenter is showing the {view === "pdf" ? "document" : "board"}
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-0.5">
          {!connected && <span role="status" className="mr-1 rounded-sm bg-danger-soft px-2 py-1 text-xs text-danger">Reconnecting…</span>}

          <VoiceBroadcast socket={socket} room={room} isTutor={isHost} />
          {isHost && <SessionRecorder room={room} socket={socket} />}

          <div ref={peopleRef} className="relative">
            <button
              type="button" onClick={() => setPeopleOpen((v) => !v)} aria-expanded={peopleOpen} aria-label="Participants"
              className={`flex h-9 items-center gap-1.5 rounded-md px-2 text-sm text-gray-700 hover:bg-sunken ${peopleOpen ? "bg-sunken" : ""}`}
            >
              <Users size={17} strokeWidth={1.8} /> <span className="tabular-nums">{stats.totalUsers ?? listeners.length}</span>
            </button>
            {peopleOpen && (
              <div className="float-panel absolute right-0 top-full z-40 mt-1.5 w-64 p-2">
                <div className="px-2 pb-1.5 pt-1 text-[11px] font-medium uppercase tracking-wider text-muted">In this room · {stats.totalUsers ?? listeners.length}</div>
                <ul className="scroll-thin max-h-72 overflow-y-auto">
                  {listeners.length === 0 && <li className="px-2 py-2 text-sm text-muted">Just you for now.</li>}
                  {listeners.map((u, i) => (
                    <li key={u.socketId || i} className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-sunken">
                      <span className="truncate">{u.name || "Guest"}</span>
                      {u.isTutor && <span className="ml-2 rounded-sm bg-accent-soft px-1.5 py-0.5 text-[10px] font-medium text-accent">Host</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {isHost ? (
            <button
              type="button" onClick={qa.toggleQaEnabled} disabled={qa.qaLoading} aria-pressed={qa.qaEnabled}
              className={`hidden h-9 items-center gap-1.5 rounded-md px-2.5 text-sm sm:flex ${qa.qaEnabled ? "bg-ok-soft text-ok" : "text-gray-700 hover:bg-sunken"}`}
            >
              <CircleHelp size={16} /> Q&A {qa.qaEnabled ? "on" : "off"}
            </button>
          ) : null}
          {isHost && (
            <IconButton
              icon={ListChecks}
              label="Class questions and polls"
              badge={activity.activity?.status === "open" ? activity.activity.responses.length : 0}
              active={activityOpen}
              onClick={() => setActivityOpen((open) => !open)}
            />
          )}
          {(isHost ? qa.qaEnabled || unanswered > 0 : qa.qaEnabled) && (
            <IconButton icon={CircleHelp} label={isHost ? "Open questions" : "Ask a question"} badge={isHost ? unanswered : 0} active={qa.qaPanelOpen} onClick={() => qa.setQaPanelOpen(!qa.qaPanelOpen)}/>
          )}

          {fullscreen.supported && (
            <button
              type="button"
              onClick={fullscreen.toggle}
              aria-pressed={fullscreen.active}
              aria-label={fullscreen.active ? "Exit full screen" : "Full screen"}
              title={fullscreen.active ? "Exit full screen (Esc or F)" : "Full screen (F)"}
              className={`flex h-9 w-9 items-center justify-center rounded-md text-gray-700 hover:bg-sunken ${fullscreen.active ? "bg-sunken" : ""}`}
            >
              {fullscreen.active ? <Shrink size={18} strokeWidth={1.8} /> : <Expand size={18} strokeWidth={1.8} />}
            </button>
          )}

          <div ref={menuRef} className="relative">
            <IconButton icon={MoreHorizontal} label="More" active={menuOpen} onClick={() => setMenuOpen((v) => !v)} />
            {menuOpen && (
              <div className="float-panel absolute right-0 top-full z-40 mt-1.5 w-60 p-1.5">
                <button type="button" onClick={copyLink} className="flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-sm hover:bg-sunken"><Link2 size={15} /> Copy invite link</button>
                <div className="px-2.5 pb-1.5 text-xs text-muted">Code <span className="font-mono text-gray-800">{room.code}</span></div>
                {isHost && (
                  <>
                    <div className="my-1 h-px bg-line md:hidden" />
                    {["whiteboard", "pdf"].map((id) => (
                      <button key={id} type="button" onClick={() => { changeView(id); setMenuOpen(false); }} className="flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-sm hover:bg-sunken md:hidden">
                        {id === "pdf" ? <FileText size={15} /> : <PenLine size={15} />} Show {id === "pdf" ? "document" : "board"} {view === id && <Check size={14} className="ml-auto text-accent" />}
                      </button>
                    ))}
                    <button type="button" onClick={() => { qa.toggleQaEnabled(); setMenuOpen(false); }} className="flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-sm hover:bg-sunken sm:hidden"><CircleHelp size={15} /> Turn Q&A {qa.qaEnabled ? "off" : "on"}</button>
                    <div className="my-1 h-px bg-line" />
                    <button type="button" onClick={() => { setConfirmEnd(true); setMenuOpen(false); }} className="flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-sm text-danger hover:bg-danger-soft"><Square size={14} /> End session</button>
                  </>
                )}
                {!isHost && (
                  <>
                    <div className="my-1 h-px bg-line" />
                    <button type="button" onClick={leave} className="flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-sm hover:bg-sunken"><LogOut size={15} /> Leave room</button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {isRecording && (
        <div role="status" className="z-20 flex h-8 shrink-0 items-center justify-center gap-2 bg-danger px-3 text-xs font-medium text-white">
          <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
          This session is being recorded by the host.
        </div>
      )}

      <main className="relative min-h-0 flex-1">
        <div className={`absolute inset-0 ${view === "whiteboard" ? "" : "invisible pointer-events-none"}`} aria-hidden={view !== "whiteboard"}>
          <BoardWorkspace room={room} socket={socket} isHost={isHost} initial={roomState} visible={view === "whiteboard"} apiRef={boardApiRef} />
        </div>
        <div className={`absolute inset-0 ${view === "pdf" ? "" : "invisible pointer-events-none"}`} aria-hidden={view !== "pdf"}>
          <PDFWorkspace room={room} socket={socket} isHost={isHost} initial={roomState} visible={view === "pdf"} />
        </div>
      </main>

      {isHost && activityOpen && (
        <ActivityHost
          activity={activity.activity}
          students={stats.students || 0}
          actions={activity}
          boardApi={boardApiRef}
          onClose={() => setActivityOpen(false)}
        />
      )}
      {!isHost && <ActivityStudent activity={activity.activity} onRespond={activity.respond} />}
      {!isHost && <Spotlight spotlight={activity.activity?.spotlight} />}

      <QaPanel
        qaPanelOpen={qa.qaPanelOpen}
        onClose={() => qa.setQaPanelOpen(false)}
        room={room}
        isTutor={isHost}
        qaEnabled={qa.qaEnabled}
        socket={socket}
        studentQuestions={qa.studentQuestions}
        onSubmitQuestion={qa.submitQuestion}
        onMarkQuestionAnswered={qa.markQuestionAnswered}
      />

      <ToastContainer position="top-center" autoClose={1800} hideProgressBar newestOnTop closeOnClick pauseOnFocusLoss={false} theme="dark" toastStyle={{ borderRadius: 6, fontSize: 14 }} />

      {confirmEnd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4" role="dialog" aria-modal="true" aria-label="End session">
          <div className="float-panel w-full max-w-sm p-5">
            <div className="flex items-start justify-between">
              <h3 className="text-base font-semibold">End this session?</h3>
              <button type="button" aria-label="Close" onClick={() => setConfirmEnd(false)} className="-mr-1 -mt-1 rounded-md p-1 text-gray-600 hover:bg-sunken"><X size={16} /></button>
            </div>
            <p className="mt-1.5 text-sm text-muted">Everyone is disconnected. Your board and document are saved, and you can resume the session later from My rooms.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmEnd(false)} className="h-9 rounded-md border border-line px-3 text-sm hover:bg-sunken">Keep going</button>
              <button type="button" onClick={() => setStatus("inactive")} className="h-9 rounded-md bg-danger px-3 text-sm font-medium text-white hover:opacity-90">End session</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
