import { Clock } from "lucide-react";

const InactiveRoom = ({ room, isTutor, onNavigateToLobby, onActivateRoom }) => (
  <div className="flex min-h-screen items-center justify-center bg-paper px-4">
    <div className="w-full max-w-sm rounded-xl border border-line bg-surface p-7">
      <Clock size={24} strokeWidth={1.5} className="text-gray-500" />
      <h1 className="font-display mt-4 text-3xl">This session has ended</h1>
      <p className="mt-2 text-sm text-muted">{isTutor ? "Your board and document are saved. Start it again whenever you are ready." : "The host has ended this session. Check back later or ask them for a new link."}</p>

      <dl className="mt-6 divide-y divide-line border-y border-line text-sm">
        {[["Topic", room.topic], ["Host", room.creator?.name], ["Code", room.code], room.lastActivity && ["Last active", new Date(room.lastActivity).toLocaleDateString("en-GB")]]
          .filter(Boolean)
          .map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-2.5"><dt className="text-muted">{k}</dt><dd className={`truncate font-medium ${k === "Code" ? "font-mono" : ""}`}>{v}</dd></div>
          ))}
      </dl>

      {isTutor ? (
        <div className="mt-6 space-y-2">
          <button onClick={onActivateRoom} className="h-10 w-full rounded-md bg-accent text-sm font-medium text-white hover:bg-accent-strong">Start session again</button>
          <button onClick={onNavigateToLobby} className="h-10 w-full rounded-md border border-line text-sm hover:bg-sunken">Back to my rooms</button>
        </div>
      ) : (
        <a href="/dashboard" className="mt-6 flex h-10 w-full items-center justify-center rounded-md border border-line text-sm hover:bg-sunken">Go to dashboard</a>
      )}
    </div>
  </div>
);

export default InactiveRoom;
