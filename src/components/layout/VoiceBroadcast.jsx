// VoiceBroadcast.jsx: the room's voice. The host starts a voice session and talks; listeners hear it.
// A listener the host has allowed to speak gets a microphone button and can mute or unmute themselves.
//
// Audio goes through LiveKit (a media server): each speaker sends one stream to the server, which delivers it to
// every listener. That is what lets a large room have many people speaking at once. The server hands out
// short-lived passes (socket event "voice-token"); only the host and allowed speakers get one that can publish.
// Captions still come from the host's microphone, as before.

import { useState, useRef, useEffect, useCallback } from 'react';
import { FaMicrophone, FaMicrophoneSlash, FaVolumeUp, FaVolumeMute, FaSpinner, FaClosedCaptioning } from 'react-icons/fa';
import { toast } from 'react-toastify';
import "./Audio.css"

// Ask the server for a pass to the voice session
const getPass = (socket, roomId) => new Promise((resolve) => {
  const timer = setTimeout(() => resolve({ ok: false, error: 'The voice server did not answer.' }), 10000);
  socket.emit('voice-token', { roomId }, (reply) => {
    clearTimeout(timer);
    resolve(reply || { ok: false, error: 'The voice server did not answer.' });
  });
});

const micError = (error) => {
  if (error?.name === 'NotAllowedError') return 'Microphone access denied';
  if (error?.name === 'NotFoundError') return 'No microphone found';
  return 'Could not use the microphone';
};

const Captions = ({ subtitles, currentTranscript }) => (
  <div className="fixed bottom-10 left-0 right-0 px-4 z-40 pointer-events-none">
    <div className="max-w-2xl mx-auto text-left">
      {subtitles.slice(-3).map((subtitle) => (
        <div key={subtitle.id} className="px-2 py-2 inline-block" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', color: '#ffffff', fontSize: '13px', lineHeight: '1.4' }}>
          {subtitle.text}
        </div>
      ))}
      {currentTranscript && (
        <div className="px-2 py-2 inline-block" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', color: '#ffffff', fontSize: '13px', lineHeight: '1.4' }}>
          {currentTranscript}
        </div>
      )}
    </div>
  </div>
);

const VoiceBroadcast = ({ room, socket, isTutor, canSpeak = false }) => {
  const roomId = room._id;
  const [status, setStatus] = useState('idle'); // idle | connecting | live
  const [micOn, setMicOn] = useState(false); // my microphone is sending
  const [audioBlocked, setAudioBlocked] = useState(false); // the browser needs a tap before it plays sound
  const [soundOff, setSoundOff] = useState(false); // I muted the room's sound for myself
  const [speakers, setSpeakers] = useState([]); // who is talking right now

  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false);
  const [subtitles, setSubtitles] = useState([]);
  const [currentTranscript, setCurrentTranscript] = useState('');

  const lkRoomRef = useRef(null);
  const lkRef = useRef(null); // the livekit-client module, loaded the first time voice starts
  const audioBoxRef = useRef(null);
  const joiningRef = useRef(false);
  const soundOffRef = useRef(false);

  // Host-only: captions are made from the host's microphone
  const audioContextRef = useRef(null);
  const processorRef = useRef(null);
  const isTranscribingRef = useRef(false);

  const setupAudioProcessing = useCallback((stream) => {
    if (!isTutor) return;
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (e) => {
        if (!isTranscribingRef.current) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const int16Data = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        if (int16Data.some((sample) => Math.abs(sample) > 100)) {
          socket.emit('audio-data', { roomId, audioData: int16Data.buffer });
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);
      audioContextRef.current = audioContext;
      processorRef.current = processor;
    } catch (error) {
      console.error('Error setting up audio processing:', error);
      toast.error('Failed to setup audio processing');
    }
  }, [socket, roomId, isTutor]);

  const stopAudioProcessing = useCallback(() => {
    isTranscribingRef.current = false;
    processorRef.current?.disconnect();
    processorRef.current = null;
    audioContextRef.current?.close().catch(() => {});
    audioContextRef.current = null;
  }, []);

  const toggleSubtitles = () => {
    const next = !subtitlesEnabled;
    setSubtitlesEnabled(next);
    if (next) {
      toast.success('Caption enabled for you');
    } else {
      toast.info('Caption disabled for you');
      setSubtitles([]);
      setCurrentTranscript('');
    }
  };

  /* ---------------------------- the voice session ---------------------------- */

  const leaveSession = useCallback(async () => {
    const lkRoom = lkRoomRef.current;
    lkRoomRef.current = null;
    audioBoxRef.current?.replaceChildren();
    setStatus('idle');
    setMicOn(false);
    setSpeakers([]);
    setAudioBlocked(false);
    if (lkRoom) await lkRoom.disconnect().catch(() => {});
  }, []);

  const joinSession = useCallback(async () => {
    if (lkRoomRef.current || joiningRef.current) return lkRoomRef.current;
    joiningRef.current = true;
    setStatus('connecting');
    try {
      const pass = await getPass(socket, roomId);
      if (!pass.ok) throw new Error(pass.error);
      const lk = lkRef.current || (lkRef.current = await import('livekit-client'));
      const lkRoom = new lk.Room({
        dynacast: true,
        audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });

      lkRoom
        .on(lk.RoomEvent.TrackSubscribed, (track) => {
          if (track.kind !== lk.Track.Kind.Audio) return;
          const element = track.attach();
          element.muted = soundOffRef.current;
          audioBoxRef.current?.appendChild(element);
        })
        .on(lk.RoomEvent.TrackUnsubscribed, (track) => {
          track.detach().forEach((element) => element.remove());
        })
        .on(lk.RoomEvent.AudioPlaybackStatusChanged, () => setAudioBlocked(!lkRoom.canPlaybackAudio))
        .on(lk.RoomEvent.ActiveSpeakersChanged, (active) => {
          setSpeakers(active.filter((p) => !p.isLocal).map((p) => p.name || 'Guest').slice(0, 3));
        })
        // The host can switch off my microphone at any time
        .on(lk.RoomEvent.LocalTrackUnpublished, () => setMicOn(false))
        .on(lk.RoomEvent.Disconnected, () => {
          if (lkRoomRef.current === lkRoom) {
            lkRoomRef.current = null;
            audioBoxRef.current?.replaceChildren();
            setStatus('idle');
            setMicOn(false);
            setSpeakers([]);
          }
        });

      await lkRoom.connect(pass.url, pass.token);
      lkRoomRef.current = lkRoom;
      setStatus('live');
      setAudioBlocked(!lkRoom.canPlaybackAudio);
      lkRoom.startAudio().catch(() => {});
      return lkRoom;
    } catch (error) {
      console.error('Voice error:', error);
      setStatus('idle');
      toast.error(error.message || 'Could not join the voice session');
      return null;
    } finally {
      joiningRef.current = false;
    }
  }, [socket, roomId]);

  /* ------------------------------- host controls ------------------------------ */

  const startBroadcast = async () => {
    if (!isTutor) return;
    setStatus('connecting');
    socket.emit('voice-broadcast-started', { roomId });
    const lkRoom = await joinSession();
    if (!lkRoom) {
      socket.emit('voice-broadcast-ended', { roomId });
      return;
    }
    try {
      await lkRoom.localParticipant.setMicrophoneEnabled(true);
    } catch (error) {
      toast.error(micError(error));
      await leaveSession();
      socket.emit('voice-broadcast-ended', { roomId });
      return;
    }
    setMicOn(true);

    // Captions: feed the same microphone to the transcription service
    const publication = lkRoom.localParticipant.getTrackPublication(lkRef.current.Track.Source.Microphone);
    const track = publication?.audioTrack?.mediaStreamTrack;
    if (track) {
      setupAudioProcessing(new MediaStream([track]));
      isTranscribingRef.current = true;
      socket.emit('start-transcription', { roomId });
    }
    toast.success('Voice broadcast started');
  };

  const stopBroadcast = async () => {
    if (!isTutor) return;
    socket.emit('stop-transcription', { roomId });
    stopAudioProcessing();
    await leaveSession();
    socket.emit('voice-broadcast-ended', { roomId });
    toast.success('Voice broadcast stopped');
  };

  /* ---------------------- listener controls (when allowed) ---------------------- */

  const toggleMyMic = async () => {
    const lkRoom = lkRoomRef.current;
    if (!lkRoom) return;
    try {
      await lkRoom.localParticipant.setMicrophoneEnabled(!micOn);
      setMicOn(!micOn);
    } catch (error) {
      toast.error(error?.name ? micError(error) : 'The host has not let you speak.');
    }
  };

  const toggleSound = () => {
    const next = !soundOff;
    soundOffRef.current = next;
    setSoundOff(next);
    audioBoxRef.current?.querySelectorAll('audio').forEach((element) => { element.muted = next; });
  };

  const enableSound = () => {
    lkRoomRef.current?.startAudio().then(() => setAudioBlocked(false)).catch(() => {});
  };

  // The host turned my microphone off
  useEffect(() => {
    if (isTutor || canSpeak || !micOn) return;
    lkRoomRef.current?.localParticipant.setMicrophoneEnabled(false).catch(() => {});
    setMicOn(false);
    toast.info('The host turned off your microphone');
  }, [canSpeak, micOn, isTutor]);

  /* ---------------------------------- events ---------------------------------- */

  useEffect(() => {
    if (!socket) return undefined;

    const onSubtitle = (data) => {
      if (data.isFinal) {
        setSubtitles((prev) => [...prev, { id: data.timestamp, text: data.text, timestamp: data.timestamp, confidence: data.confidence }].slice(-50));
        setCurrentTranscript('');
      } else {
        setCurrentTranscript(data.text);
      }
    };
    const onTranscriptionError = (data) => {
      toast.error('Transcription error: ' + data.error);
      isTranscribingRef.current = false;
    };
    // The host started a session: listeners join it
    const onStarted = (data) => {
      if (isTutor || data.roomId !== roomId) return;
      joinSession();
    };
    const onEnded = (data) => {
      if (isTutor || data.roomId !== roomId) return; // the host ended it themselves
      leaveSession();
      toast.info(data.reason === 'tutor_disconnected' ? 'Host disconnected - voice ended' : 'Voice broadcast ended');
    };

    socket.on('subtitle-received', onSubtitle);
    socket.on('transcription-error', onTranscriptionError);
    socket.on('voice-broadcast-started', onStarted);
    socket.on('voice-broadcast-ended', onEnded);
    return () => {
      socket.off('subtitle-received', onSubtitle);
      socket.off('transcription-error', onTranscriptionError);
      socket.off('voice-broadcast-started', onStarted);
      socket.off('voice-broadcast-ended', onEnded);
    };
  }, [socket, roomId, isTutor, joinSession, leaveSession]);

  // A listener who arrives late (or reconnects) asks whether a session is already running
  useEffect(() => {
    if (isTutor || !socket || !roomId) return undefined;
    const ask = () => socket.emit('request-broadcast-status', { roomId });
    const timer = setTimeout(ask, 1000);
    socket.on('connect', ask);
    return () => {
      clearTimeout(timer);
      socket.off('connect', ask);
    };
  }, [socket, roomId, isTutor]);

  // Leaving the page ends my side of the call
  useEffect(() => () => {
    stopAudioProcessing();
    const lkRoom = lkRoomRef.current;
    lkRoomRef.current = null;
    lkRoom?.disconnect().catch(() => {});
  }, [stopAudioProcessing]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setSubtitles((prev) => prev.filter((sub) => now - sub.timestamp < 30000));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const live = status === 'live';
  const connecting = status === 'connecting';
  const audioBox = <div ref={audioBoxRef} style={{ display: 'none' }} aria-hidden="true" />;

  /* ----------------------------------- host ----------------------------------- */

  if (isTutor) {
    return (
      <div className="flex items-center gap-2 ml-3 mr-3 border-gray-200">
        <button
          onClick={micOn ? stopBroadcast : startBroadcast}
          disabled={connecting}
          className={`relative flex items-center justify-center w-10 h-10 rounded-full transition-all ${
            connecting ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : micOn ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
          }`}
          title={micOn ? 'Stop Broadcast' : 'Start Broadcast'}
        >
          {connecting ? <FaSpinner className="animate-spin" /> : micOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
        </button>

        <div className={`absolute ml-[33px] mt-7 w-2 h-2 rounded-full ${micOn && live ? 'bg-green-500 animate-pulse' : connecting ? 'bg-yellow-500' : 'bg-gray-400'}`} />

        {micOn && (
          <button
            onClick={toggleSubtitles}
            className={`flex items-center cursor-pointer justify-center w-5 h-5 transition-all ${subtitlesEnabled ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            title={subtitlesEnabled ? 'Hide Captions' : 'Show Captions'}
          >
            <FaClosedCaptioning />
          </button>
        )}

        {subtitlesEnabled && micOn && <Captions subtitles={subtitles} currentTranscript={currentTranscript} />}
        {audioBox}
      </div>
    );
  }

  /* --------------------------------- listener --------------------------------- */

  return (
    <div className="flex items-center gap-2 ml-2 mr-2 border-gray-200">
      <div
        title={speakers.length ? `${speakers.join(', ')} speaking` : live ? 'Connected to the voice session' : 'No voice session'}
        className={`relative flex items-center justify-center w-10 h-10 rounded-full transition-all ${live && speakers.length ? 'bg-green-400 animate-pulse' : live ? 'bg-green-300' : connecting ? 'bg-yellow-500' : 'bg-gray-400'}`}
      >
        {connecting ? <FaSpinner className="animate-spin" /> : live && !soundOff ? <FaVolumeUp /> : <FaVolumeMute />}
      </div>

      {live && audioBlocked && (
        <button onClick={enableSound} className="h-8 rounded-md bg-ink px-2.5 text-xs font-medium text-paper">Tap to hear</button>
      )}

      {live && (
        <button
          onClick={toggleSound}
          className={`flex items-center justify-center w-5 h-5 cursor-pointer transition-all ${soundOff ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          title={soundOff ? 'Unmute the room' : 'Mute the room for me'}
          aria-pressed={soundOff}
        >
          {soundOff ? <FaVolumeMute /> : <FaVolumeUp />}
        </button>
      )}

      {/* Only when the host has allowed me to speak. It starts muted; I choose when to unmute. */}
      {live && canSpeak && (
        <button
          onClick={toggleMyMic}
          aria-pressed={micOn}
          className={`flex items-center justify-center w-10 h-10 rounded-full transition-all ${micOn ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}`}
          title={micOn ? 'Mute my microphone' : 'Unmute my microphone'}
        >
          {micOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
        </button>
      )}

      {live && (
        <button
          onClick={toggleSubtitles}
          className={`flex items-center justify-center w-5 h-5 cursor-pointer transition-all ${subtitlesEnabled ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          title={subtitlesEnabled ? 'Hide Captions' : 'Show Captions'}
        >
          <FaClosedCaptioning />
        </button>
      )}

      {subtitlesEnabled && live && <Captions subtitles={subtitles} currentTranscript={currentTranscript} />}
      {audioBox}
    </div>
  );
};

export default VoiceBroadcast;
