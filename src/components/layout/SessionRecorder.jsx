import { useCallback, useEffect, useRef, useState } from "react";
import FloatingPanel from "../FloatingPanel.jsx";
import { CircleDot, Download, LoaderCircle, Mic, Monitor, Video } from "lucide-react";
import api from "../../utils/api";

const MAX_RECORDING_BYTES = 500 * 1024 * 1024;
const SOURCES_KEY = "boardly.recording.sources";

// Recording captures the screen, which phones (and most tablets) cannot do: their browsers have no screen capture,
// so the Record button is left out there instead of failing with an error.
const canCaptureScreen = () => typeof navigator !== "undefined" && typeof navigator.mediaDevices?.getDisplayMedia === "function";

// What goes into a recording besides the screen. Remembered on this browser, so a host who always records
// with their voice does not have to remember to switch it on.
function readSources() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(SOURCES_KEY) || "null");
    return { mic: saved?.mic === true, camera: saved?.camera === true };
  } catch {
    return { mic: false, camera: false };
  }
}
function saveSources(sources) {
  try {
    window.localStorage.setItem(SOURCES_KEY, JSON.stringify(sources));
  } catch { /* storage unavailable: the choice still applies for this visit */ }
}

function describeDeviceError(error, what) {
  if (error?.name === "NotFoundError" || error?.name === "OverconstrainedError") return `No ${what} found`;
  if (error?.name === "NotAllowedError" || error?.name === "SecurityError") return `${what[0].toUpperCase()}${what.slice(1)} access was blocked`;
  if (error?.name === "NotReadableError") return `The ${what} is in use by another app`;
  return `The ${what} could not be started`;
}

const stopTracks = (stream) => stream?.getTracks().forEach((track) => track.stop());

// Ask for one device at a time, so a missing camera never stops the screen (or the microphone) from recording
async function optionalDevice(constraints, what, skipped) {
  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch (error) {
    skipped.push(describeDeviceError(error, what));
    return null;
  }
}

function preferredMimeType() {
  if (!window.MediaRecorder) throw new Error("This browser does not support session recording.");
  return [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/mp4",
    "video/webm",
  ].find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

function waitForVideo(video) {
  return new Promise((resolve, reject) => {
    video.onloadedmetadata = () => video.play().then(resolve, reject);
    video.onerror = () => reject(new Error("Could not start the captured video stream."));
  });
}

export default function SessionRecorder({ room, socket }) {
  const [phase, setPhase] = useState("idle");
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [localBlob, setLocalBlob] = useState(null);
  const [localDuration, setLocalDuration] = useState(0);
  const [sources, setSources] = useState(readSources);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const recordingRef = useRef(null);
  const rootRef = useRef(null);

  const toggleSource = (key) => setSources((current) => {
    const next = { ...current, [key]: !current[key] };
    saveSources(next);
    return next;
  });

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDown = (e) => { if (!rootRef.current?.contains(e.target)) setMenuOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setMenuOpen(false); };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(""), 8000);
    return () => clearTimeout(timer);
  }, [notice]);

  const stopRecording = useCallback(() => {
    const active = recordingRef.current;
    if (!active || active.stopping) return;
    active.stopping = true;
    if (active.recorder?.state === "recording") active.recorder.stop();
    if (active.animationFrame) cancelAnimationFrame(active.animationFrame);
    [active.displayStream, active.cameraStream, active.micStream, active.outputStream].forEach(stopTracks);
    active.audioContext?.close().catch(() => {});
    if (active.screenVideo) active.screenVideo.srcObject = null;
    if (active.cameraVideo) active.cameraVideo.srcObject = null;
    socket.emit("recording-state", { room: room._id, active: false });
    setPhase("saving");
  }, [room._id, socket]);

  const saveRecording = useCallback(async (blob, durationSeconds) => {
    setLocalBlob(blob);
    setLocalDuration(durationSeconds);
    setPhase("uploading");
    setError("");
    setProgress(0);
    if (blob.size > MAX_RECORDING_BYTES) {
      setPhase("failed");
      setError("Recording is larger than the 500 MB upload limit. Download the local copy below.");
      return;
    }
    try {
      const mimeType = blob.type.split(";")[0] || "video/webm";
      await api.post(`/recordings/rooms/${room._id}`, blob, {
        headers: {
          "Content-Type": mimeType,
          "X-Recording-Duration": String(Math.max(1, Math.floor(durationSeconds))),
          "X-Recording-Title": encodeURIComponent(room.topic.slice(0, 100)),
        },
        timeout: 0,
        transformRequest: [(data) => data],
        onUploadProgress: (event) => {
          if (event.total) setProgress(Math.round((event.loaded / event.total) * 100));
        },
      });
      setProgress(100);
      setPhase("saved");
      setLocalBlob(null);
    } catch (uploadError) {
      setPhase("failed");
      setError(uploadError.response?.data?.message || "Could not save the recording. Download the local copy or retry.");
    }
  }, [room._id, room.topic]);

  const startRecording = async () => {
    setError("");
    setNotice("");
    setMenuOpen(false);
    setLocalBlob(null);
    let displayStream;
    let cameraStream = null;
    let micStream = null;
    let audioContext;
    let recorder;
    try {
      const mimeType = preferredMimeType();
      displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 30, max: 30 } },
        audio: true,
      });
      // Camera and microphone are optional: if one is missing or blocked, record without it and say so
      const skipped = [];
      if (sources.camera) {
        cameraStream = await optionalDevice({ video: { width: { ideal: 640 }, height: { ideal: 360 }, facingMode: "user" } }, "camera", skipped);
      }
      if (sources.mic) {
        micStream = await optionalDevice({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }, "microphone", skipped);
      }
      if (skipped.length) setNotice(`${skipped.join(" and ")}, so the recording has only what is available.`);

      const displayTrack = displayStream.getVideoTracks()[0];
      const displaySettings = displayTrack?.getSettings() || {};
      const width = Math.min(1920, displaySettings.width || 1280);
      const height = Math.min(1080, displaySettings.height || 720);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Could not initialize the recording canvas.");

      const screenVideo = document.createElement("video");
      screenVideo.srcObject = displayStream;
      screenVideo.muted = true;
      screenVideo.playsInline = true;
      await waitForVideo(screenVideo);
      let cameraVideo = null;
      if (cameraStream) {
        cameraVideo = document.createElement("video");
        cameraVideo.srcObject = cameraStream;
        cameraVideo.muted = true;
        cameraVideo.playsInline = true;
        await waitForVideo(cameraVideo);
      }

      const drawFrame = () => {
        context.drawImage(screenVideo, 0, 0, width, height);
        const margin = Math.round(width * 0.025);
        if (cameraVideo) {
          const insetWidth = Math.round(width * 0.2);
          const insetHeight = Math.round(insetWidth * 9 / 16);
          const x = width - insetWidth - margin;
          const y = height - insetHeight - margin;
          context.fillStyle = "rgba(17, 24, 39, 0.8)";
          context.fillRect(x - 3, y - 3, insetWidth + 6, insetHeight + 6);
          context.drawImage(cameraVideo, x, y, insetWidth, insetHeight);
        }
        context.fillStyle = "#ef4444";
        context.beginPath();
        context.arc(margin + 12, margin + 12, 8, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = "#fff";
        context.font = `${Math.max(14, Math.round(width * 0.012))}px system-ui, sans-serif`;
        context.fillText("REC", margin + 27, margin + 17);
        recordingRef.current.animationFrame = requestAnimationFrame(drawFrame);
      };
      const outputStream = canvas.captureStream(30);
      recordingRef.current = { displayStream, cameraStream, micStream, outputStream, recorder: null, animationFrame: 0, audioContext: null, stopping: false, startedAt: Date.now() };
      drawFrame();

      // Sound from the shared tab and, when chosen, the microphone are mixed into one track
      const audioSources = [displayStream, micStream].filter((stream) => stream?.getAudioTracks().length);
      if (audioSources.length) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) throw new Error("This browser does not support audio recording.");
        audioContext = new AudioContextClass();
        await audioContext.resume();
        const mixedAudio = audioContext.createMediaStreamDestination();
        for (const sourceStream of audioSources) audioContext.createMediaStreamSource(sourceStream).connect(mixedAudio);
        for (const track of mixedAudio.stream.getAudioTracks()) outputStream.addTrack(track);
      }
      const options = { videoBitsPerSecond: 1_000_000, audioBitsPerSecond: 96_000 };
      if (mimeType) options.mimeType = mimeType;
      recorder = new MediaRecorder(outputStream, options);
      const chunks = [];
      const active = recordingRef.current;
      active.recorder = recorder;
      active.audioContext = audioContext;
      active.cameraVideo = cameraVideo;
      active.screenVideo = screenVideo;
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onstop = () => {
        recordingRef.current = null;
        const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || "video/webm" });
        const durationSeconds = (Date.now() - active.startedAt) / 1000;
        if (!blob.size) {
          setPhase("failed");
          setError("The browser did not produce a recording. Check screen-recording permissions and try again.");
          return;
        }
        saveRecording(blob, durationSeconds);
      };
      recorder.onerror = () => {
        setError("Recording stopped unexpectedly. Try again.");
        stopRecording();
      };
      displayTrack.addEventListener("ended", stopRecording, { once: true });
      recorder.start(1000);
      socket.emit("recording-state", { room: room._id, active: true });
      setPhase("recording");
    } catch (startError) {
      if (recorder?.state === "recording") recorder.stop();
      const active = recordingRef.current;
      if (active?.recorder && active.recorder.state === "inactive") {
        active.recorder.onstop = null;
        active.recorder.ondataavailable = null;
      }
      if (active?.animationFrame) cancelAnimationFrame(active.animationFrame);
      [displayStream, cameraStream, micStream, active?.outputStream].forEach(stopTracks);
      if (active?.screenVideo) active.screenVideo.srcObject = null;
      if (active?.cameraVideo) active.cameraVideo.srcObject = null;
      audioContext?.close().catch(() => {});
      recordingRef.current = null;
      setPhase("failed");
      setError(!displayStream && startError.name === "NotAllowedError"
        ? "Screen sharing was cancelled or blocked. Click Record and choose a tab or screen to share."
        : startError.message || "Could not start recording. Allow screen sharing and try again.");
    }
  };

  useEffect(() => () => {
    const active = recordingRef.current;
    if (!active) return;
    if (active.recorder?.state === "recording") active.recorder.stop();
    [active.displayStream, active.cameraStream, active.micStream, active.outputStream].forEach(stopTracks);
    active.audioContext?.close().catch(() => {});
    if (active.animationFrame) cancelAnimationFrame(active.animationFrame);
    socket.emit("recording-state", { room: room._id, active: false });
  }, [room._id, socket]);

  const downloadLocalCopy = () => {
    if (!localBlob) return;
    const url = URL.createObjectURL(localBlob);
    const anchor = document.createElement("a");
    anchor.href = url;
    const extension = localBlob.type.includes("mp4") ? "mp4" : localBlob.type.includes("ogg") ? "ogg" : "webm";
    anchor.download = `${room.topic.replace(/[^\w-]+/g, "-").slice(0, 70) || "boardly-session"}.${extension}`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (!canCaptureScreen()) return null;

  const busy = ["saving", "uploading"].includes(phase);
  const summary = ["Screen", sources.mic && "microphone", sources.camera && "camera"].filter(Boolean).join(" + ");

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={phase === "recording" ? stopRecording : () => setMenuOpen((open) => !open)}
        disabled={busy}
        aria-label={phase === "recording" ? "Stop session recording" : "Record the session"}
        aria-haspopup={phase === "recording" ? undefined : "dialog"}
        aria-expanded={phase === "recording" ? undefined : menuOpen}
        title={phase === "recording" ? "Stop recording" : "Record the session"}
        className={`flex h-9 items-center gap-1.5 rounded-md px-2 text-sm disabled:opacity-60 ${phase === "recording" ? "rec-pulse bg-danger-soft text-danger" : menuOpen ? "bg-sunken text-ink" : "text-gray-700 hover:bg-sunken"}`}
      >
        {busy ? <LoaderCircle size={16} className="animate-spin" /> : phase === "recording" ? <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-60" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-danger" /></span> : <CircleDot size={16} className="text-danger" />}
        <span className="hidden sm:inline">{phase === "recording" ? "Stop" : busy ? `${progress || ""} Saving` : "Record"}</span>
      </button>
      {phase === "recording" && <span role="status" className="sr-only">Recording: {summary}</span>}
      {menuOpen && phase !== "recording" && (
        <FloatingPanel role="dialog" aria-label="Recording options" className="absolute right-0 top-full z-50 mt-2 max-h-[calc(100dvh-4rem)] w-72 overflow-y-auto p-3">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted">What to record</div>
          <ul className="mt-2 space-y-1">
            <li className="flex items-center gap-2.5 rounded-md px-2 py-1.5">
              <Monitor size={16} className="shrink-0 text-gray-700" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">Screen or tab</div>
                <div className="text-xs text-muted">You choose it next. Tick “share tab audio” to include its sound.</div>
              </div>
              <span className="text-xs text-muted">Always</span>
            </li>
            <SourceToggle icon={Mic} label="Microphone" hint={sources.mic ? "Your voice is recorded." : "Off: your voice is not recorded."} on={sources.mic} onToggle={() => toggleSource("mic")} />
            <SourceToggle icon={Video} label="Camera" hint={sources.camera ? "Shown in the corner of the recording." : "Off: no camera needed."} on={sources.camera} onToggle={() => toggleSource("camera")} />
          </ul>
          <button type="button" onClick={startRecording} className="mt-3 flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-ink text-sm font-medium text-paper hover:opacity-90">
            <CircleDot size={15} /> Start recording
          </button>
          <p className="mt-2 text-center text-[11px] text-muted">{summary} · your choice is remembered</p>
        </FloatingPanel>
      )}
      {phase === "uploading" && <span role="status" className="sr-only">Saving recording: {progress}%</span>}
      {notice && !error && (
        <div role="status" className="fixed left-1/2 top-14 z-[60] flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-3 rounded-md bg-ink px-4 py-2.5 text-sm text-paper shadow-lg">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice("")} aria-label="Dismiss" className="shrink-0 text-lg leading-none">×</button>
        </div>
      )}
      {(error || phase === "saved") && (
        <div role={error ? "alert" : "status"} className={`fixed left-1/2 top-14 z-[60] flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-3 rounded-md px-4 py-2.5 text-sm shadow-lg ${error ? "bg-danger text-white" : "bg-ink text-paper"}`}>
          <span>{error || "Recording saved to your dashboard."}</span>
          {localBlob && phase === "failed" && (
            <>
              <button type="button" onClick={downloadLocalCopy} className="inline-flex shrink-0 items-center gap-1 rounded border border-white/40 px-2 py-1 text-xs"><Download size={13} /> Download</button>
              <button type="button" onClick={() => saveRecording(localBlob, localDuration)} className="shrink-0 underline">Retry</button>
            </>
          )}
          <button type="button" onClick={() => { setError(""); if (phase === "saved") setPhase("idle"); }} aria-label="Dismiss" className="shrink-0 text-lg leading-none">×</button>
        </div>
      )}
    </div>
  );
}

function SourceToggle({ icon: Icon, label, hint, on, onToggle }) {
  return (
    <li>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={onToggle}
        className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left hover:bg-sunken"
      >
        <Icon size={16} className="shrink-0 text-gray-700" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">{label}</span>
          <span className="block text-xs text-muted">{hint}</span>
        </span>
        <span aria-hidden="true" className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${on ? "bg-accent" : "bg-line-strong"}`}>
          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
        </span>
      </button>
    </li>
  );
}
