import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Copy, Loader2, Plus, Search, Trash2 } from "lucide-react";
import api from "../utils/api";
import Header from "./Header";

const fmt = (d) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(d));

export default function Lobby() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [toDelete, setToDelete] = useState(null);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    api.get("/rooms").then((r) => setRooms(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const shown = useMemo(() => rooms.filter((r) => r.topic.toLowerCase().includes(q.toLowerCase())), [rooms, q]);

  const remove = async (id) => {
    try {
      await api.delete(`/rooms/${id}`);
      setRooms((rs) => rs.filter((r) => r._id !== id));
    } finally {
      setToDelete(null);
    }
  };

  const copy = async (room) => {
    await navigator.clipboard.writeText(`${window.location.origin}/room/${room.code}`);
    setCopied(room._id);
    setTimeout(() => setCopied(""), 1500);
  };

  return (
    <div className="min-h-screen bg-paper">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl">My rooms</h1>
            <p className="mt-1 text-sm text-muted">{rooms.length} {rooms.length === 1 ? "room" : "rooms"}</p>
          </div>
          <Link to="/create" className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-sm font-medium text-paper hover:bg-gray-800"><Plus size={16} /> New room</Link>
        </div>

        <div className="relative mt-6 max-w-sm">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search rooms" aria-label="Search rooms" className="h-10 w-full rounded-md border border-line-strong bg-white pl-9 pr-3 text-sm focus:border-accent focus:outline-none" />
        </div>

        {loading ? (
          <div role="status" className="mt-16 flex justify-center text-muted"><Loader2 className="animate-spin" /></div>
        ) : shown.length === 0 ? (
          <div className="mt-10 rounded-lg border border-dashed border-line-strong bg-white px-6 py-14 text-center">
            <p className="text-[15px] font-medium">{q ? "No rooms match that search" : "You have no rooms yet"}</p>
            {!q && <><p className="mt-1 text-sm text-muted">Create one and share the link.</p><Link to="/create" className="mt-4 inline-flex h-10 items-center rounded-md bg-ink px-4 text-sm font-medium text-paper">Create a room</Link></>}
          </div>
        ) : (
          <ul className="mt-6 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
            {shown.map((r) => (
              <li key={r._id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 sm:px-5">
                <button type="button" onClick={() => navigate(`/room/${r.code}`)} className="min-w-0 flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[15px] font-medium">{r.topic}</span>
                    <span className={`shrink-0 rounded-sm px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${r.status === "active" ? "bg-ok-soft text-ok" : "bg-sunken text-muted"}`}>{r.status === "active" ? "Live" : "Ended"}</span>
                    {r.isPaid && <span className="shrink-0 rounded-sm bg-accent-soft px-1.5 py-0.5 text-[10px] font-medium text-accent">₦{r.price?.toLocaleString()}</span>}
                  </div>
                  <div className="mt-0.5 text-xs text-muted">Created {fmt(r.createdAt)} · <span className="font-mono">{r.code}</span></div>
                </button>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => copy(r)} className="flex h-9 items-center gap-1.5 rounded-md border border-line px-2.5 text-sm hover:bg-sunken"><Copy size={14} /> {copied === r._id ? "Copied" : "Copy link"}</button>
                  <button type="button" onClick={() => navigate(`/room/${r.code}`)} className="h-9 rounded-md bg-ink px-3.5 text-sm font-medium text-paper hover:bg-gray-800">{r.status === "active" ? "Enter" : "Open"}</button>
                  <button type="button" aria-label={`Delete ${r.topic}`} onClick={() => setToDelete(r)} className="flex h-9 w-9 items-center justify-center rounded-md text-gray-500 hover:bg-danger-soft hover:text-danger"><Trash2 size={15} /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      {toDelete && (
        <div className="modal-safe fixed inset-0 z-50 flex items-center justify-center bg-ink/40" role="dialog" aria-modal="true" aria-label="Delete room">
          <div className="float-panel w-full max-w-sm p-5">
            <h2 className="text-base font-semibold">Delete “{toDelete.topic}”?</h2>
            <p className="mt-1.5 text-sm text-muted">The board and document in this room are removed permanently.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setToDelete(null)} className="h-9 rounded-md border border-line px-3 text-sm hover:bg-sunken">Cancel</button>
              <button type="button" onClick={() => remove(toDelete._id)} className="h-9 rounded-md bg-danger px-3 text-sm font-medium text-white hover:opacity-90">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
