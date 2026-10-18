// The people in the room. The host also decides here who may draw and who may speak: one switch for everyone,
// or one per person. Built to stay light in a big room: it searches, and draws at most MAX_ROWS people at a time.
import { useMemo, useState } from "react";
import { Mic, PenLine, Search } from "lucide-react";

const MAX_ROWS = 100;

function Switch({ on, onClick, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${on ? "bg-accent" : "bg-line-strong"}`}
    >
      <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
    </button>
  );
}

function PersonToggle({ icon: Icon, on, inherited, label, onClick }) {
  return (
    <button
      type="button"
      aria-pressed={on || inherited}
      aria-label={label}
      title={inherited ? `${label} (everyone is allowed)` : label}
      onClick={onClick}
      disabled={inherited}
      className={`flex h-8 w-8 items-center justify-center rounded-md ${on || inherited ? "bg-accent-soft text-accent" : "text-gray-500 hover:bg-sunken"} ${inherited ? "opacity-60" : ""}`}
    >
      <Icon size={15} />
    </button>
  );
}

export default function ParticipantsPanel({ isHost, users, total, flags, access, myKey, onSet }) {
  const [query, setQuery] = useState("");
  const draw = useMemo(() => new Set(access.draw), [access.draw]);
  const speak = useMemo(() => new Set(access.speak), [access.speak]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? users.filter((u) => (u.name || "Guest").toLowerCase().includes(q)) : users;
    return { rows: list.slice(0, MAX_ROWS), more: Math.max(0, list.length - MAX_ROWS) };
  }, [users, query]);

  return (
    <div className="float-panel absolute right-0 top-full z-40 mt-1.5 w-[min(20rem,calc(100vw-1rem))] p-2">
      <div className="px-2 pb-1.5 pt-1 text-[11px] font-medium uppercase tracking-wider text-muted">In this room · {total}</div>

      {isHost && (
        <div className="mb-1.5 space-y-0.5 border-b border-line px-1 pb-2">
          <label className="flex items-center gap-2.5 rounded-md px-1 py-1.5 text-sm">
            <PenLine size={15} className="shrink-0 text-gray-700" />
            <span className="flex-1">Everyone can draw</span>
            <Switch on={flags.drawAll} label="Let everyone draw" onClick={() => onSet("draw", undefined, !flags.drawAll)} />
          </label>
          <label className="flex items-center gap-2.5 rounded-md px-1 py-1.5 text-sm">
            <Mic size={15} className="shrink-0 text-gray-700" />
            <span className="flex-1">Everyone can speak</span>
            <Switch on={flags.speakAll} label="Let everyone speak" onClick={() => onSet("speak", undefined, !flags.speakAll)} />
          </label>
        </div>
      )}

      {users.length > 8 && (
        <div className="relative mb-1 px-1">
          <Search size={14} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find someone"
            aria-label="Find someone in the room"
            className="h-8 w-full rounded-md border border-line bg-surface pl-8 pr-2 text-sm outline-none focus:border-ink"
          />
        </div>
      )}

      <ul className="scroll-thin max-h-72 overflow-y-auto">
        {users.length === 0 && <li className="px-2 py-2 text-sm text-muted">{total > 1 ? "The list is only shown to the host in a large room." : "Just you for now."}</li>}
        {shown.rows.map((u, i) => (
          <li key={u.key || i} className="flex items-center justify-between gap-1 rounded-md px-2 py-1 text-sm hover:bg-sunken">
            <span className="min-w-0 flex-1 truncate">
              {u.name || "Guest"}{u.key && u.key === myKey ? " (you)" : ""}
            </span>
            {u.isTutor ? (
              <span className="ml-2 rounded-sm bg-accent-soft px-1.5 py-0.5 text-[10px] font-medium text-accent">Host</span>
            ) : isHost && u.key ? (
              <span className="flex shrink-0 items-center">
                <PersonToggle icon={PenLine} on={draw.has(u.key)} inherited={flags.drawAll} label={`Let ${u.name || "Guest"} draw`} onClick={() => onSet("draw", u.key, !draw.has(u.key))} />
                <PersonToggle icon={Mic} on={speak.has(u.key)} inherited={flags.speakAll} label={`Let ${u.name || "Guest"} speak`} onClick={() => onSet("speak", u.key, !speak.has(u.key))} />
              </span>
            ) : null}
          </li>
        ))}
        {shown.more > 0 && <li className="px-2 py-2 text-xs text-muted">{shown.more} more. Search to find someone.</li>}
        {query && shown.rows.length === 0 && <li className="px-2 py-2 text-sm text-muted">No one matches.</li>}
      </ul>
    </div>
  );
}
