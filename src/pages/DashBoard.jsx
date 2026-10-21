import usePageTitle from "../hooks/usePageTitle.js";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowUpRight, Copy, Download, Plus, Trash2 } from "lucide-react";
import Header from "./Header";
import api from "../utils/api";

const date = (value) => value
  ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value))
  : "—";

export default function Dashboard() {
  usePageTitle("Dashboard");
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [recordings, setRecordings] = useState([]);
  const [recordingsLoading, setRecordingsLoading] = useState(true);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [recordingError, setRecordingError] = useState("");
  const [copiedId, setCopiedId] = useState("");

  useEffect(() => {
    Promise.all([api.get("/auth/profile"), api.get("/rooms")])
      .then(([user, roomResponse]) => {
        setProfile(user.data);
        setRooms(Array.isArray(roomResponse.data) ? roomResponse.data : []);
      })
      .catch(() => setError("We couldn’t load your workspace. Refresh to try again."));
    api.get("/recordings")
      .then((response) => setRecordings(Array.isArray(response.data) ? response.data : []))
      .catch(() => setRecordingError("Saved session recordings could not be loaded."))
      .finally(() => setRecordingsLoading(false));
  }, []);

  const join = (event) => {
    event.preventDefault();
    const roomCode = code.trim();
    if (roomCode) navigate(`/room/${roomCode}`);
  };

  const copyRecordingLink = async (recording) => {
    try {
      await navigator.clipboard.writeText(recording.url);
      setCopiedId(recording._id);
      window.setTimeout(() => setCopiedId(""), 2000);
    } catch {
      setRecordingError("Could not copy the link. Open the recording and copy its URL.");
    }
  };

  const deleteRecording = async (recording) => {
    if (!window.confirm(`Delete “${recording.title}”? This also removes its saved video.`)) return;
    try {
      await api.delete(`/recordings/${recording._id}`);
      setRecordings((items) => items.filter((item) => item._id !== recording._id));
    } catch (deleteError) {
      setRecordingError(deleteError.response?.data?.message || "Could not delete this recording.");
    }
  };

  if (!profile && !error) {
    return <div className="min-h-screen bg-paper"><Header /><p className="mx-auto max-w-6xl px-4 py-16 text-sm text-muted">Loading workspace…</p></div>;
  }
  const activeRooms = rooms.filter((room) => room.status === "active");

  return (
    <div className="min-h-screen bg-paper">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <header className="flex flex-col justify-between gap-5 border-b border-line pb-8 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted">Workspace</p>
            <h1 className="mt-2 font-display text-5xl">Good to see you, {profile?.name?.split(" ")[0]}</h1>
            <p className="mt-3 text-muted">Create a room, share the link, and work together in real time.</p>
          </div>
          <Link to="/create" className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-accent px-4 text-sm font-medium text-white hover:bg-accent-strong"><Plus size={16} /> New room</Link>
        </header>
        {error && <p className="border-b border-danger/20 py-4 text-sm text-danger">{error}</p>}
        <section className="grid gap-5 border-b border-line py-6 lg:grid-cols-[1fr_auto]">
          <form onSubmit={join} className="flex max-w-md">
            <input value={code} onChange={(event) => setCode(event.target.value)} placeholder="Enter a room code" aria-label="Room code" className="h-10 min-w-0 flex-1 rounded-l-md border border-line-strong bg-white px-3 font-mono text-sm" />
            <button className="h-10 rounded-r-md bg-accent px-4 text-sm font-medium text-white hover:bg-accent-strong">Join room</button>
          </form>
          <p className="self-center text-sm text-muted">Have a link? Paste its room code to join.</p>
        </section>
        <section className="grid border-b border-line sm:grid-cols-3">
          <Metric label="Rooms created" value={rooms.length} tone="bg-accent" />
          <Metric label="Active now" value={activeRooms.length} tone="bg-leaf-500" />
          <Metric label="Member since" value={date(profile?.createdAt)} tone="bg-coral-500" />
        </section>

        <section className="border-b border-line py-9">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">Saved session recordings</h2>
              <p className="mt-1 text-sm text-muted">Play, download, or share recordings from rooms you hosted.</p>
            </div>
            <span className="text-sm text-muted">{recordings.length} saved</span>
          </div>
          {recordingError && <p role="alert" className="mt-3 text-sm text-danger">{recordingError}</p>}
          {recordingsLoading ? (
            <p role="status" className="mt-5 py-8 text-center text-sm text-muted">Loading saved recordings…</p>
          ) : recordings.length ? (
            <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {recordings.map((recording) => (
                <article key={recording._id} className="overflow-hidden rounded-lg border border-line bg-white">
                  <video className="aspect-video w-full bg-black" src={recording.url} controls preload="metadata" playsInline />
                  <div className="p-4">
                    <h3 className="truncate text-sm font-semibold">{recording.title}</h3>
                    <p className="mt-1 text-xs text-muted">
                      {date(recording.createdAt)} · {formatDuration(recording.durationSeconds)} · {formatBytes(recording.bytes)}
                    </p>
                    {recording.room?.topic && <p className="mt-1 truncate text-xs text-muted">Room: {recording.room.topic}</p>}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a
                        href={recording.url.replace("/video/upload/", "/video/upload/fl_attachment/")}
                        download
                        className="inline-flex h-8 items-center gap-1.5 rounded-md bg-accent px-2.5 text-xs font-medium text-white hover:opacity-90"
                      >
                        <Download size={14} /> Download
                      </a>
                      <button type="button" onClick={() => copyRecordingLink(recording)} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line px-2.5 text-xs hover:bg-sunken">
                        <Copy size={14} /> {copiedId === recording._id ? "Copied" : "Share link"}
                      </button>
                      <button type="button" onClick={() => deleteRecording(recording)} aria-label={`Delete ${recording.title}`} className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-md text-danger hover:bg-danger-soft">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-md border border-dashed border-line-strong px-4 py-8 text-center text-sm text-muted">
              No saved recordings yet. Start recording from a hosted room to save it here.
            </p>
          )}
        </section>

        <section className="grid gap-10 py-10 lg:grid-cols-[1.3fr_0.7fr]">
          <div>
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold">Recent rooms</h2>
              <Link to="/lobby" className="text-sm text-accent hover:underline">View all rooms</Link>
            </div>
            <div className="mt-4 border-y border-line">
              {rooms.slice(0, 6).map((room) => (
                <Link key={room._id} to={`/room/${room.code}`} className="flex items-center justify-between gap-3 border-b border-line py-4 last:border-0 hover:bg-sunken">
                  <span>
                    <span className="block text-sm font-medium">{room.topic}</span>
                    <span className="mt-1 block text-xs text-muted">Created {date(room.createdAt)} · <span className="font-mono">{room.code}</span></span>
                  </span>
                  <ArrowUpRight size={17} className="shrink-0 text-muted" />
                </Link>
              ))}
              {!rooms.length && <div className="py-9 text-sm text-muted">No rooms yet. Create one when you’re ready to collaborate.</div>}
            </div>
          </div>
          <aside className="border-t border-line pt-5 lg:border-l lg:border-t-0 lg:pl-8">
            <p className="text-sm font-medium">Getting started</p>
            <ol className="mt-4 space-y-4 text-sm leading-6 text-muted">
              <li><span className="mr-2 font-mono text-ink">01</span>Create a whiteboard or document room.</li>
              <li><span className="mr-2 font-mono text-ink">02</span>Share its private link with participants.</li>
              <li><span className="mr-2 font-mono text-ink">03</span>Collaborate live, then return when you need to.</li>
            </ol>
          </aside>
        </section>
      </main>
    </div>
  );
}

function Metric({ label, value, tone = "bg-accent" }) {
  return <div className="border-b border-line py-6 sm:border-b-0 sm:border-r sm:px-6 first:sm:pl-0 last:border-r-0"><p className="flex items-center gap-2 text-sm text-muted"><span className={`h-2 w-2 rounded-full ${tone}`} aria-hidden="true" />{label}</p><p className="font-display mt-2 text-3xl">{value}</p></div>;
}

function formatDuration(value = 0) {
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatBytes(value = 0) {
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}
