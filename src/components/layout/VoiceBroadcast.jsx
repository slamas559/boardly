// VoiceBroadcast.jsx - Enhanced with independent subtitle control

import { useState, useRef, useEffect, useCallback } from 'react';
import { FaMicrophone, FaMicrophoneSlash, FaVolumeUp, FaVolumeDown, FaSpinner, FaVolumeMute, FaClosedCaptioning } from 'react-icons/fa';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import "./Audio.css"

const VoiceBroadcast = ({ room, socket, isTutor }) => {
  const [isMicOn, setIsMicOn] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isReceivingAudio, setIsReceivingAudio] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  
  // Subtitle states - now independent per user
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false);
  const [subtitles, setSubtitles] = useState([]);
  const [currentTranscript, setCurrentTranscript] = useState('');

  // Refs for WebRTC
  const localStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const studentConnectionsRef = useRef(new Map());
  const audioElementRef = useRef(null);
  const localAudioRef = useRef(null);
  
  // Refs for audio processing
  const audioContextRef = useRef(null);
  const processorRef = useRef(null);
  const isTranscribingRef = useRef(false);

  // ICE servers configuration
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      {
        urls: "stun:stun.relay.metered.ca:80",
      },
      {
        urls: "turn:global.relay.metered.ca:80",
        username: "2cfa1595142a47dbb11045c5",
        credential: "ERtjygb2qEQukVHt",
      },
      {
        urls: "turn:global.relay.metered.ca:80?transport=tcp",
        username: "2cfa1595142a47dbb11045c5",
        credential: "ERtjygb2qEQukVHt",
      },
      {
        urls: "turn:global.relay.metered.ca:443",
        username: "2cfa1595142a47dbb11045c5",
        credential: "ERtjygb2qEQukVHt",
      },
      {
        urls: "turns:global.relay.metered.ca:443?transport=tcp",
        username: "2cfa1595142a47dbb11045c5",
        credential: "ERtjygb2qEQukVHt",
      },
    ]
  };

  const setupAudioProcessing = useCallback((stream) => {
    if (!isTutor) return;
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000
      });
      
      console.log('Audio context created with sample rate:', audioContext.sampleRate);
      
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
        
        const hasAudio = int16Data.some(sample => Math.abs(sample) > 100);
        
        if (hasAudio) {
          socket.emit('audio-data', {
            roomId: room._id,
            audioData: int16Data.buffer
          });
        }
      };
      
      source.connect(processor);
      processor.connect(audioContext.destination);
      
      audioContextRef.current = audioContext;
      processorRef.current = processor;
      
      console.log('✓ Audio processing setup complete');
      
    } catch (error) {
      console.error('Error setting up audio processing:', error);
      toast.error('Failed to setup audio processing');
    }
  }, [socket, room._id, isTutor]);

  // Toggle subtitles - now only controls local display
  const toggleSubtitles = () => {
    const newState = !subtitlesEnabled;
    setSubtitlesEnabled(newState);
    
    if (newState) {
      toast.success('Caption enabled for you');
    } else {
      toast.info('Caption disabled for you');
      // Only clear local display, don't emit clear event
      setSubtitles([]);
      setCurrentTranscript('');
    }
  };

  // Create peer connection for a specific student (tutor side)
  const createStudentConnection = useCallback(async (studentSocketId) => {
    if (!isTutor || !localStreamRef.current) return null;

    console.log(`Creating connection for student: ${studentSocketId}`);

    const peerConnection = new RTCPeerConnection(iceServers);

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('voice-ice-candidate', {
          roomId: room._id,
          candidate: event.candidate,
          targetStudentId: studentSocketId
        });
      }
    };

    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState;
      console.log(`Connection state with student ${studentSocketId}: ${state}`);
      
      if (state === 'connected') {
        console.log(`Successfully connected to student: ${studentSocketId}`);
      } else if (state === 'failed' || state === 'disconnected') {
        console.log(`Connection failed/disconnected with student: ${studentSocketId}`);
        studentConnectionsRef.current.delete(studentSocketId);
      }
    };

    localStreamRef.current.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStreamRef.current);
    });

    studentConnectionsRef.current.set(studentSocketId, peerConnection);

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    socket.emit('voice-offer', {
      roomId: room._id,
      offer: offer,
      targetStudentId: studentSocketId
    });

    console.log(`Sent offer to student: ${studentSocketId}`);
    return peerConnection;
  }, [socket, room._id, isTutor]);

  // Create peer connection for student side
  const createStudentPeerConnection = useCallback(() => {
    if (isTutor) return null;

    console.log('Creating peer connection for student');

    const peerConnection = new RTCPeerConnection(iceServers);

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('voice-ice-candidate', {
          roomId: room._id,
          candidate: event.candidate
        });
      }
    };

    peerConnection.ontrack = (event) => {
      console.log('Received remote stream from tutor');
      const [remoteStream] = event.streams;
      
      if (audioElementRef.current) {
        audioElementRef.current.srcObject = remoteStream;
        audioElementRef.current.volume = volume;
        setIsReceivingAudio(true);
        setIsConnecting(false);
        setConnectionStatus('connected');
        console.log('Audio element updated with tutor stream');
      }
    };

    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState;
      console.log(`Student connection state: ${state}`);
      setConnectionStatus(state);
      
      if (state === 'connected') {
        setIsConnecting(false);
        toast.success('Connected to tutor\'s audio');
      } else if (state === 'failed' || state === 'disconnected') {
        setIsConnecting(false);
        setIsReceivingAudio(false);
        if (state === 'failed') {
          toast.error('Failed to connect to voice broadcast');
        }
      }
    };

    peerConnectionRef.current = peerConnection;
    return peerConnection;
  }, [socket, room._id, volume]);

  // Start voice broadcast (tutor only)
  const startBroadcast = async () => {
    if (!isTutor) return;
    
    setIsConnecting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        } 
      });
      
      localStreamRef.current = stream;
      console.log('Got local stream, starting broadcast...');
      
      // Setup audio processing for transcription
      setupAudioProcessing(stream);
      
      // Auto-start transcription when mic is enabled
      isTranscribingRef.current = true;
      socket.emit('start-transcription', { roomId: room._id });
      
      socket.emit('voice-broadcast-started', {
        roomId: room._id
      });

      setIsMicOn(true);
      setIsConnecting(false);
      setConnectionStatus('connected');
      
      if (localAudioRef.current) {
        localAudioRef.current.srcObject = stream;
        localAudioRef.current.muted = true;
      }

      toast.success('Voice broadcast started');
      console.log('Voice broadcast and transcription started');

    } catch (error) {
      console.error('Error starting voice broadcast:', error);
      setIsConnecting(false);
      
      if (error.name === 'NotAllowedError') {
        toast.error('Microphone access denied');
      } else if (error.name === 'NotFoundError') {
        toast.error('No microphone found');
      } else {
        toast.error('Failed to start voice broadcast');
      }
    }
  };

  // Stop voice broadcast (tutor only)
  const stopBroadcast = () => {
    if (!isTutor) return;

    console.log('Stopping voice broadcast...');

    // Stop transcription
    isTranscribingRef.current = false;
    socket.emit('stop-transcription', { roomId: room._id });

    // Clean up audio processing
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    studentConnectionsRef.current.forEach((peerConnection, studentId) => {
      console.log(`Closing connection to student: ${studentId}`);
      peerConnection.close();
    });
    studentConnectionsRef.current.clear();

    socket.emit('voice-broadcast-ended', { roomId: room._id });

    setIsMicOn(false);
    setIsConnecting(false);
    setConnectionStatus('disconnected');
    toast.success('Voice broadcast stopped');
  };

  const handleVolumeChange = (newVolume) => {
    setVolume(newVolume);
    if (audioElementRef.current) {
      audioElementRef.current.volume = newVolume;
    }
  };

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    // Subtitle events - now received by all users but only displayed if enabled
    const handleSubtitleReceived = (data) => {
      if (data.isFinal) {
        setSubtitles(prev => {
          const newSubtitles = [...prev, {
            id: data.timestamp,
            text: data.text,
            timestamp: data.timestamp,
            confidence: data.confidence
          }];
          return newSubtitles.slice(-50);
        });
        console.log('Final subtitle received:', data.text);
        setCurrentTranscript('');
      } else {
        setCurrentTranscript(data.text);
      }
    };

    const handleTranscriptionStarted = () => {
      console.log('Transcription started successfully');
    };

    const handleTranscriptionError = (data) => {
      console.error('Transcription error:', data.error);
      toast.error('Transcription error: ' + data.error);
      isTranscribingRef.current = false;
    };

    // Existing voice events
    const handleBroadcastStarted = (data) => {
      if (isTutor || data.roomId !== room._id) return;
      
      console.log('Tutor started broadcast, connecting...');
      setIsConnecting(true);
      
      socket.emit('student-join-broadcast', { 
        roomId: room._id,
        studentSocketId: socket.id 
      });
    };

    const handleStudentJoinBroadcast = async (data) => {
      if (!isTutor || data.roomId !== room._id || !isMicOn) return;
      
      console.log('Student requesting to join broadcast:', data.studentSocketId);
      await createStudentConnection(data.studentSocketId);
    };

    const handleVoiceOffer = async (data) => {
      if (isTutor || data.roomId !== room._id) return;
      
      console.log('Received voice offer from tutor');
      
      try {
        if (peerConnectionRef.current) {
          peerConnectionRef.current.close();
        }
        
        const peerConnection = createStudentPeerConnection();
        
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
        
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        
        socket.emit('voice-answer', {
          roomId: room._id,
          answer: answer,
          socketId: socket.id
        });
        
        console.log('Sent answer to tutor');
      } catch (error) {
        console.error('Error handling voice offer:', error);
        setIsConnecting(false);
        toast.error('Failed to connect to voice broadcast');
      }
    };

    const handleVoiceAnswer = async (data) => {
      if (!isTutor || data.roomId !== room._id) return;
      
      console.log('Received answer from student:', data.studentSocketId);
      
      try {
        const peerConnection = studentConnectionsRef.current.get(data.studentSocketId);
        if (peerConnection) {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
          console.log(`Connected to student: ${data.studentSocketId}`);
        }
      } catch (error) {
        console.error('Error handling voice answer:', error);
      }
    };

    const handleIceCandidate = async (data) => {
      if (data.roomId !== room._id) return;
      
      try {
        if (isTutor) {
          if (data.targetStudentId) {
            const peerConnection = studentConnectionsRef.current.get(data.targetStudentId);
            if (peerConnection) {
              await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
            }
          } else {
            studentConnectionsRef.current.forEach(async (peerConnection) => {
              try {
                await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
              } catch (err) {
                // Ignore
              }
            });
          }
        } else {
          if (peerConnectionRef.current) {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
          }
        }
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    };

    const handleBroadcastEnded = (data) => {
      if (data.roomId !== room._id) return;
      
      console.log('Voice broadcast ended');
      
      if (isTutor) {
        studentConnectionsRef.current.forEach((peerConnection) => {
          peerConnection.close();
        });
        studentConnectionsRef.current.clear();
        setIsMicOn(false);
      } else {
        if (peerConnectionRef.current) {
          peerConnectionRef.current.close();
          peerConnectionRef.current = null;
        }
        
        if (audioElementRef.current) {
          audioElementRef.current.srcObject = null;
        }
        
        setIsReceivingAudio(false);
      }
      
      setConnectionStatus('disconnected');
      setIsConnecting(false);
      
      if (data.reason === 'tutor_disconnected') {
        toast.info('Tutor disconnected - voice broadcast ended');
      } else {
        toast.info('Voice broadcast ended');
      }
    };

    socket.on('subtitle-received', handleSubtitleReceived);
    socket.on('transcription-started', handleTranscriptionStarted);
    socket.on('transcription-error', handleTranscriptionError);
    socket.on('voice-broadcast-started', handleBroadcastStarted);
    socket.on('student-join-broadcast', handleStudentJoinBroadcast);
    socket.on('voice-offer', handleVoiceOffer);
    socket.on('voice-answer', handleVoiceAnswer);
    socket.on('voice-ice-candidate', handleIceCandidate);
    socket.on('voice-broadcast-ended', handleBroadcastEnded);

    return () => {
      socket.off('subtitle-received', handleSubtitleReceived);
      socket.off('transcription-started', handleTranscriptionStarted);
      socket.off('transcription-error', handleTranscriptionError);
      socket.off('voice-broadcast-started', handleBroadcastStarted);
      socket.off('student-join-broadcast', handleStudentJoinBroadcast);
      socket.off('voice-offer', handleVoiceOffer);
      socket.off('voice-answer', handleVoiceAnswer);
      socket.off('voice-ice-candidate', handleIceCandidate);
      socket.off('voice-broadcast-ended', handleBroadcastEnded);
    };
  }, [socket, room._id, isTutor, createStudentConnection, createStudentPeerConnection, volume, isMicOn]);

  // Auto-request broadcast status for students
  useEffect(() => {
    if (!isTutor && socket && room._id) {
      const timer = setTimeout(() => {
        socket.emit('request-broadcast-status', { 
          roomId: room._id,
          studentSocketId: socket.id 
        });
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [socket, room._id, isTutor]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isTutor && isMicOn) {
        stopBroadcast();
      }
      
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      
      studentConnectionsRef.current.forEach((peerConnection) => {
        peerConnection.close();
      });
      studentConnectionsRef.current.clear();
      
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }

      if (processorRef.current) {
        processorRef.current.disconnect();
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Auto-cleanup old subtitles
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setSubtitles(prev => 
        prev.filter(sub => now - sub.timestamp < 30000)
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Render tutor controls
  if (isTutor) {
    return (
      <div className="flex items-center gap-2 ml-3 mr-3 border-gray-200">
        {/* Microphone button */}
        <button
          onClick={isMicOn ? stopBroadcast : startBroadcast}
          disabled={isConnecting}
          className={`relative flex items-center justify-center w-10 h-10 rounded-full transition-all ${
            isConnecting
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : isMicOn
              ? 'bg-red-100 text-red-600 hover:bg-red-200'
              : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
          }`}
          title={isMicOn ? "Stop Broadcast" : "Start Broadcast"}
        >
          {isConnecting ? (
            <FaSpinner className="animate-spin" />
          ) : isMicOn ? (
            <FaMicrophone />
          ) : (
            <FaMicrophoneSlash />
          )}
        </button>
        
        {/* Connection indicator */}
        <div className={`absolute ml-[33px] mt-7 w-2 h-2 rounded-full ${
          isMicOn && connectionStatus === 'connected'
            ? 'bg-green-500 animate-pulse' 
            : isConnecting
            ? 'bg-yellow-500'
            : 'bg-gray-400'
        }`} />

        {/* Subtitle toggle button - always available when mic is on */}
        {isMicOn && (
          <button
            onClick={toggleSubtitles}
            className={`flex items-center cursor-pointer justify-center w-5 h-5 transition-all ${
              subtitlesEnabled
                ? 'bg-green-100 text-green-600 hover:bg-green-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title={subtitlesEnabled ? "Hide Captions" : "Show Captions"}
          >
            <FaClosedCaptioning />
          </button>
        )}

        {/* Subtitle display for tutor - only shown if enabled */}
        {subtitlesEnabled && isMicOn && (
          <div className="fixed bottom-10 left-0 right-0 px-4 z-40 pointer-events-none">
            <div className="max-w-2xl mx-auto text-left">
              {subtitles.slice(-3).map((subtitle) => (
                <div
                  key={subtitle.id}
                  className="px-2 py-2 inline-block"
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    color: '#ffffff',
                    fontSize: '13px',
                    lineHeight: '1.4'
                  }}
                >
                  {subtitle.text}
                </div>
              ))}
              {currentTranscript && (
                <div
                  className="px-2 py-2 inline-block"
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    color: '#ffffff',
                    fontSize: '13px',
                    lineHeight: '1.4'
                  }}
                >
                  {currentTranscript}
                </div>
              )}
            </div>
          </div>
        )}
        
        <audio ref={localAudioRef} style={{ display: 'none' }} />
      </div>
    );
  }

  // Render student controls
  return (
    <div className="flex items-center gap-2 ml-2 mr-2 border-gray-200">
      {/* Audio status indicator */}
      <div className={`relative flex items-center justify-center w-10 h-10 rounded-full transition-all ${
        isReceivingAudio 
          ? 'bg-green-400 animate-pulse' 
          : isConnecting
          ? 'bg-yellow-500'
          : 'bg-gray-400'
      }`}>
        {isConnecting ? (
          <FaSpinner className="animate-spin" />
        ) : isReceivingAudio ? (
          <FaVolumeUp />
        ) : (
          <FaVolumeMute />
        )}
      </div>

      {/* Subtitle toggle for students - available when receiving audio */}
      {isReceivingAudio && (
        <button
          onClick={toggleSubtitles}
          className={`flex items-center justify-center w-5 h-5 cursor-pointer transition-all ${
            subtitlesEnabled
              ? 'bg-green-100 text-green-600 hover:bg-green-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          title={subtitlesEnabled ? "Hide Captions" : "Show Captions"}
        >
          <FaClosedCaptioning />
        </button>
      )}

      {/* Subtitle display for students - only shown if enabled */}
      {subtitlesEnabled && isReceivingAudio && (
        <div className="fixed bottom-10 left-0 right-0 px-4 z-40 pointer-events-none">
          <div className="max-w-2xl mx-auto text-left">
            {subtitles.slice(-3).map((subtitle) => (
              <div
                key={subtitle.id}
                className="px-2 py-2 inline-block"
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  color: '#ffffff',
                  fontSize: '13px',
                  lineHeight: '1.4'
                }}
              >
                {subtitle.text}
              </div>
            ))}

            {currentTranscript && (
              <div
                className="px-2 py-2 inline-block"
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  color: '#ffffff',
                  fontSize: '13px',
                  lineHeight: '1.4'
                }}
              >
                {currentTranscript}
              </div>
            )}
          </div>
        </div>
      )}
      
      <audio 
        ref={audioElementRef} 
        autoPlay 
        playsInline
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default VoiceBroadcast;