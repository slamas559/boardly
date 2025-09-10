import { useState, useRef, useEffect, useCallback } from 'react';
import { FaMicrophone, FaMicrophoneSlash, FaVolumeUp, FaVolumeDown, FaSpinner, FaCamera, FaPodcast, FaHeadphones, FaHeadphonesAlt, FaVolumeMute, FaVolumeOff } from 'react-icons/fa';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import "./Audio.css"

const VoiceBroadcast = ({ room, socket, isTutor }) => {
  const [isMicOn, setIsMicOn] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isReceivingAudio, setIsReceivingAudio] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  // Refs for WebRTC
  const localStreamRef = useRef(null);
  const peerConnectionRef = useRef(null); // Single connection for students, managed connections for tutors
  const studentConnectionsRef = useRef(new Map()); // For tutors to track student connections
  const audioElementRef = useRef(null);
  const localAudioRef = useRef(null);

  // ICE servers configuration
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  // Create peer connection for a specific student (tutor side)
  const createStudentConnection = useCallback(async (studentSocketId) => {
    if (!isTutor || !localStreamRef.current) return null;

    console.log(`Creating connection for student: ${studentSocketId}`);

    const peerConnection = new RTCPeerConnection(iceServers);

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('voice-ice-candidate', {
          roomId: room._id,
          candidate: event.candidate,
          targetStudentId: studentSocketId
        });
      }
    };

    // Handle connection state
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

    // Add local stream
    localStreamRef.current.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStreamRef.current);
    });

    // Store the connection
    studentConnectionsRef.current.set(studentSocketId, peerConnection);

    // Create and send offer
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

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('voice-ice-candidate', {
          roomId: room._id,
          candidate: event.candidate
        });
      }
    };

    // Handle remote stream
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

    // Handle connection state changes
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
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      localStreamRef.current = stream;
      console.log('Got local stream, starting broadcast...');
      
      // Signal that broadcast is starting
      socket.emit('voice-broadcast-started', {
        roomId: room._id
      });

      setIsMicOn(true);
      setIsConnecting(false);
      setConnectionStatus('connected');
      
      // Optional: Add local audio preview (muted to avoid feedback)
      if (localAudioRef.current) {
        localAudioRef.current.srcObject = stream;
        localAudioRef.current.muted = true;
      }

      toast.success('Voice broadcast started');
      console.log('Voice broadcast started - ready for student connections');

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

    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    // Close all student connections
    studentConnectionsRef.current.forEach((peerConnection, studentId) => {
      console.log(`Closing connection to student: ${studentId}`);
      peerConnection.close();
    });
    studentConnectionsRef.current.clear();

    // Notify students that broadcast has ended
    socket.emit('voice-broadcast-ended', { roomId: room._id });

    setIsMicOn(false);
    setIsConnecting(false);
    setConnectionStatus('disconnected');
    toast.success('Voice broadcast stopped');
  };

  // Handle volume change (students only)
  const handleVolumeChange = (newVolume) => {
    setVolume(newVolume);
    if (audioElementRef.current) {
      audioElementRef.current.volume = newVolume;
    }
  };

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    // Handle broadcast started notification for students
    const handleBroadcastStarted = (data) => {
      if (isTutor || data.roomId !== room._id) return;
      
      console.log('Tutor started broadcast, connecting...');
      setIsConnecting(true);
      
      // Request to join the broadcast
      socket.emit('student-join-broadcast', { 
        roomId: room._id,
        studentSocketId: socket.id 
      });
    };

    // Handle broadcast status check for late-joining students
    const handleBroadcastStatusCheck = (data) => {
      if (!isTutor && data.roomId === room._id) {
        console.log('Checking for active broadcast...');
        // Request current broadcast status when joining late
        socket.emit('request-broadcast-status', { 
          roomId: room._id,
          studentSocketId: socket.id 
        });
      }
    };

    // Handle student join broadcast request (tutor side)
    const handleStudentJoinBroadcast = async (data) => {
      if (!isTutor || data.roomId !== room._id || !isMicOn) return;
      
      console.log('Student requesting to join broadcast:', data.studentSocketId);
      await createStudentConnection(data.studentSocketId);
    };

    // Handle voice offer (students only)
    const handleVoiceOffer = async (data) => {
      if (isTutor || data.roomId !== room._id) return;
      
      console.log('Received voice offer from tutor');
      
      try {
        // Clean up existing connection
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

    // Handle voice answer (tutor only)
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

    // Handle ICE candidates
    const handleIceCandidate = async (data) => {
      if (data.roomId !== room._id) return;
      
      try {
        if (isTutor) {
          // Add to specific student connection if targetStudentId is provided
          if (data.targetStudentId) {
            const peerConnection = studentConnectionsRef.current.get(data.targetStudentId);
            if (peerConnection) {
              await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
            }
          } else {
            // Add to all student connections
            studentConnectionsRef.current.forEach(async (peerConnection) => {
              try {
                await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
              } catch (err) {
                // Ignore errors for candidates not meant for this connection
              }
            });
          }
        } else {
          // For students, add to tutor connection
          if (peerConnectionRef.current) {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
          }
        }
      } catch (error) {
        console.error('Error adding ICE candidate:', error);
      }
    };

    // Handle broadcast ended
    const handleBroadcastEnded = (data) => {
      if (data.roomId !== room._id) return;
      
      console.log('Voice broadcast ended');
      
      if (isTutor) {
        // Clean up tutor side
        studentConnectionsRef.current.forEach((peerConnection) => {
          peerConnection.close();
        });
        studentConnectionsRef.current.clear();
        setIsMicOn(false);
      } else {
        // Clean up student side
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

    socket.on('voice-broadcast-started', handleBroadcastStarted);
    socket.on('check-broadcast-status', handleBroadcastStatusCheck);
    socket.on('student-join-broadcast', handleStudentJoinBroadcast);
    socket.on('voice-offer', handleVoiceOffer);
    socket.on('voice-answer', handleVoiceAnswer);
    socket.on('voice-ice-candidate', handleIceCandidate);
    socket.on('voice-broadcast-ended', handleBroadcastEnded);

    return () => {
      socket.off('voice-broadcast-started', handleBroadcastStarted);
      socket.off('check-broadcast-status', handleBroadcastStatusCheck);
      socket.off('student-join-broadcast', handleStudentJoinBroadcast);
      socket.off('voice-offer', handleVoiceOffer);
      socket.off('voice-answer', handleVoiceAnswer);
      socket.off('voice-ice-candidate', handleIceCandidate);
      socket.off('voice-broadcast-ended', handleBroadcastEnded);
    };
  }, [socket, room._id, isTutor, createStudentConnection, createStudentPeerConnection, volume, isMicOn]);

  // Auto-request broadcast status for students when component mounts
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
      
      // Clean up connections
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
    };
  }, []);

  // Render tutor controls
  if (isTutor) {
    return (
      <div className="flex items-center ml-3 mr-3 border-gray-200">
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
        
        <div className={`ml-[-4px] mt-6 w-2 h-2 rounded-full ${
          isMicOn && connectionStatus === 'connected'
            ? 'bg-green-500 animate-pulse' 
            : isConnecting
            ? 'bg-yellow-500'
            : 'bg-gray-400'
        }`}>
        </div>
        
        {/* Hidden local audio preview */}
        <audio ref={localAudioRef} style={{ display: 'none' }} />
      </div>
    );
  }

  // Render student controls
  return (
    <div className="flex items-center ml-2 mr-2 border-gray-200">
      
      <div className={`relative flex items-center justify-center w-10 h-10 rounded-full transition-all ${
        isReceivingAudio 
          ? 'bg-green-400 animate-pulse' 
          : isConnecting
          ? 'bg-yellow-500'
          : 'bg-gray-400'
      }`}>{isConnecting ? (
            <FaSpinner className="animate-spin" />
          ) : isReceivingAudio ? (
            <FaVolumeUp />
          ) : (
            <FaVolumeMute />
          )}</div>
      <span className="text-xs text-gray-500 truncate">
        {/* {isReceivingAudio ? 'Connected' : isConnecting ? 'Connecting...' : 'Waiting'} */}
      </span>
      

      
      {/* {isReceivingAudio && (
        <div className="flex items-center gap-2">
          <FaVolumeDown className="text-gray-500 text-xs" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            className="w-16 accent-blue-500"
            title="Volume Control"
          />
          <FaVolumeUp className="text-gray-500 text-xs" />
        </div>
      )} */}
      
      {/* Audio element for receiving broadcast */}
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