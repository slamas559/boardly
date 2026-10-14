import { useCallback, useEffect, useRef, useState } from "react";
import { CircleDot, Download, LoaderCircle, Square } from "lucide-react";
import api from "../../utils/api";

const MAX_RECORDING_BYTES = 500 * 1024 * 1024;

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
  const recordingRef = useRef(null);

  const stopRecording = useCallback(() => {
    const active = recordingRef.current;
    if (!active || active.stopping) return;
    active.stopping = true;
    if (active.recorder?.state === "recording") active.recorder.stop();
    if (active.animationFrame) cancelAnimationFrame(active.animationFrame);
    active.displayStream.getTracks().forEach((track) => track.stop());
    active.cameraStream.getTracks().forEach((track) => track.stop());
    active.outputStream.getTracks().forEach((track) => track.stop());
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
    setLocalBlob(null);
    let displayStream;
    let cameraStream;
    let audioContext;
    let recorder;
    try {
      const mimeType = preferredMimeType();
      displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 30, max: 30 } },
        audio: true,
      });
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 360 }, facingMode: "user" },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });

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
      const cameraVideo = document.createElement("video");
      cameraVideo.srcObject = cameraStream;
      cameraVideo.muted = true;
      cameraVideo.playsInline = true;
      await waitForVideo(cameraVideo);

      const drawFrame = () => {
        context.drawImage(screenVideo, 0, 0, width, height);
        const insetWidth = Math.round(width * 0.2);
        const insetHeight = Math.round(insetWidth * 9 / 16);
        const margin = Math.round(width * 0.025);
        const x = width - insetWidth - margin;
        const y = height - insetHeight - margin;
        context.fillStyle = "rgba(17, 24, 39, 0.8)";
        context.fillRect(x - 3, y - 3, insetWidth + 6, insetHeight + 6);
        context.drawImage(cameraVideo, x, y, insetWidth, insetHeight);
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
      recordingRef.current = { displayStream, cameraStream, outputStream, recorder: null, animationFrame: 0, audioContext: null, stopping: false, startedAt: Date.now() };
      drawFrame();

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) throw new Error("This browser does not support audio recording.");
      audioContext = new AudioContextClass();
      await audioContext.resume();
      const mixedAudio = audioContext.createMediaStreamDestination();
      for (const sourceStream of [displayStream, cameraStream]) {
        if (sourceStream.getAudioTracks().length) {
          audioContext.createMediaStreamSource(sourceStream).connect(mixedAudio);
        }
      }
      for (const track of mixedAudio.stream.getAudioTracks()) outputStream.addTrack(track);
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
      displayStream?.getTracks().forEach((track) => track.stop());
      cameraStream?.getTracks().forEach((track) => track.stop());
      active?.outputStream.getTracks().forEach((track) => track.stop());
      if (active?.screenVideo) active.screenVideo.srcObject = null;
      if (active?.cameraVideo) active.cameraVideo.srcObject = null;
      audioContext?.close().catch(() => {});
      recordingRef.current = null;
      setPhase("failed");
      setError(startError.message || "Could not start recording. Allow screen, camera, and microphone access and try again.");
    }
  };

  useEffect(() => () => {
    const active = recordingRef.current;
    if (!active) return;
    if (active.recorder?.state === "recording") active.recorder.stop();
    active.displayStream.getTracks().forEach((track) => track.stop());
    active.cameraStream.getTracks().forEach((track) => track.stop());
    active.outputStream.getTracks().forEach((track) => track.stop());
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

  return (
    <>
      <button
        type="button"
        onClick={phase === "recording" ? stopRecording : startRecording}
        disabled={["saving", "uploading"].includes(phase)}
        aria-label={phase === "recording" ? "Stop session recording" : "Start session recording"}
        title={phase === "recording" ? "Stop recording" : "Choose this browser tab, enable tab audio, and allow camera/microphone access"}
        className={`flex h-9 items-center gap-1.5 rounded-md px-2 text-sm disabled:opacity-60 ${phase === "recording" ? "bg-danger-soft text-danger" : "text-gray-700 hover:bg-sunken"}`}
      >
        {["saving", "uploading"].includes(phase) ? <LoaderCircle size={16} className="animate-spin" /> : phase === "recording" ? <Square size={14} fill="currentColor" /> : <CircleDot size={16} className="text-danger" />}
        <span className="hidden sm:inline">{phase === "recording" ? "Stop" : ["saving", "uploading"].includes(phase) ? `${progress || ""} Saving` : "Record"}</span>
      </button>
      {phase === "uploading" && <span role="status" className="sr-only">Saving recording: {progress}%</span>}
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
    </>
  );
}
