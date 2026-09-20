import { useState, useEffect, useRef, useCallback } from 'react';
import { getSocket } from '../../../shared/utils/socket';
import { User } from '../../../types';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export interface CallerInfo {
  fromUserId: string;
  fromUsername: string;
  profileImage?: string | null;
  roomId?: string;
  isVideo?: boolean;
}

export function useWebRTC(user?: User | null, membersMap: Record<string, any> = {}) {
  // Call States: 'idle' | 'calling' | 'incoming' | 'connected'
  const [callState, setCallState] = useState<'idle' | 'calling' | 'incoming' | 'connected'>('idle');
  const [callerInfo, setCallerInfo] = useState<CallerInfo | null>(null);

  const membersMapRef = useRef(membersMap);
  useEffect(() => {
    membersMapRef.current = membersMap;
  }, [membersMap]);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerTargetRef = useRef<{ targetUserId?: string; roomId?: string } | null>(null);

  // Cleanup helper
  const endCall = useCallback((emitEnd = true) => {
    if (emitEnd && peerTargetRef.current) {
      const socket = getSocket();
      socket?.emit('webrtc:call-end', {
        toUserId: peerTargetRef.current.targetUserId,
        roomId: peerTargetRef.current.roomId,
      });
    }

    if (pcRef.current) {
      pcRef.current.ontrack = null;
      pcRef.current.onicecandidate = null;
      pcRef.current.close();
      pcRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    setLocalStream(null);
    setRemoteStream(null);
    setCallState('idle');
    setCallerInfo(null);
    setIsMuted(false);
    setIsVideoOff(false);
    setIsScreenSharing(false);
    peerTargetRef.current = null;
  }, []);

  // Initialize Peer Connection
  const createPeerConnection = useCallback((targetUserId?: string, roomId?: string) => {
    if (typeof window === 'undefined') return null as any;
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const socket = getSocket();
        socket?.emit('webrtc:ice-candidate', {
          toUserId: targetUserId,
          roomId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
      } else {
        const newStream = new MediaStream([event.track]);
        setRemoteStream(newStream);
      }
    };

    return pc;
  }, []);

  // Get User Media
  const getMedia = async (video = true): Promise<MediaStream | null> => {
    if (typeof window === 'undefined' || !navigator.mediaDevices) return null;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video });
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err: any) {
      console.warn('[useWebRTC] Media access warning:', err.message);
      // Fallback to audio only if video fails
      if (video) {
        try {
          const audioOnlyStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          localStreamRef.current = audioOnlyStream;
          setLocalStream(audioOnlyStream);
          setIsVideoOff(true);
          return audioOnlyStream;
        } catch (audioErr) {
          console.error('[useWebRTC] Audio access failed:', audioErr);
        }
      }
      return null;
    }
  };

  // Start Outgoing Call
  const startCall = async (
    targetUserId?: string,
    roomId?: string,
    isVideo: boolean = true,
    targetName: string | null = null,
    targetProfileImage: string | null = null
  ) => {
    peerTargetRef.current = { targetUserId, roomId };
    setCallState('calling');
    setCallerInfo({
      fromUserId: targetUserId || '',
      fromUsername: targetName || 'User',
      profileImage: targetProfileImage || null,
      isVideo,
      roomId,
    });

    const socket = getSocket();
    if (socket) {
      socket.emit('webrtc:call-initiate', { targetUserId, roomId, isVideo }, (res: any) => {
        if (!res?.ok) {
          console.error('Failed to initiate call:', res?.error);
          endCall(false);
        }
      });
    }
  };

  // Accept Incoming Call
  const acceptCall = async () => {
    if (!callerInfo) return;
    const { fromUserId, roomId, isVideo } = callerInfo;
    peerTargetRef.current = { targetUserId: fromUserId, roomId };

    const stream = await getMedia(isVideo);
    const pc = createPeerConnection(fromUserId, roomId);

    if (stream && pc) {
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    }

    setCallState('connected');

    const socket = getSocket();
    socket?.emit('webrtc:call-accept', { toUserId: fromUserId, roomId });
  };

  // Reject Incoming Call
  const rejectCall = () => {
    if (callerInfo) {
      const socket = getSocket();
      socket?.emit('webrtc:call-reject', {
        toUserId: callerInfo.fromUserId,
        roomId: callerInfo.roomId,
      });
    }
    endCall(false);
  };

  // Toggle Mute
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  // Toggle Video
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  // Toggle Screen Share
  const toggleScreenShare = async () => {
    if (!pcRef.current || typeof window === 'undefined' || !navigator.mediaDevices) return;

    if (isScreenSharing) {
      // Switch back to camera
      const cameraStream = await getMedia(!isVideoOff);
      if (cameraStream) {
        const videoTrack = cameraStream.getVideoTracks()[0];
        const sender = pcRef.current.getSenders().find((s) => s.track?.kind === 'video');
        if (sender && videoTrack) {
          sender.replaceTrack(videoTrack);
        }
      }
      setIsScreenSharing(false);
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        const sender = pcRef.current.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(screenTrack);
        } else {
          pcRef.current.addTrack(screenTrack, screenStream);
        }

        screenTrack.onended = () => {
          toggleScreenShare();
        };

        setLocalStream(screenStream);
        setIsScreenSharing(true);
      } catch (err) {
        console.error('Screen sharing error:', err);
      }
    }
  };

  // Socket Signaling Event Listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // Incoming call listener
    socket.on('webrtc:call-incoming', (info: any) => {
      if (callState === 'idle') {
        const userMeta = membersMapRef.current?.[info.fromUserId];
        const enriched: CallerInfo = {
          ...info,
          fromUsername: info.fromUsername || userMeta?.name || userMeta?.username || 'User',
          profileImage: info.profileImage || userMeta?.profileImage || userMeta?.avatar || null,
        };
        setCallerInfo(enriched);
        setCallState('incoming');
      }
    });

    // Call Accepted listener (for caller)
    socket.on('webrtc:call-accepted', async ({ acceptedBy, roomId }: any) => {
      if (callState === 'calling') {
        setCallState('connected');
        const stream = await getMedia(callerInfo?.isVideo ?? true);
        const pc = createPeerConnection(acceptedBy, roomId);

        if (stream && pc) {
          stream.getTracks().forEach((t) => pc.addTrack(t, stream));
        }

        if (pc) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('webrtc:offer', { toUserId: acceptedBy, roomId, offer });
        }
      }
    });

    // Call Rejected listener
    socket.on('webrtc:call-rejected', () => {
      endCall(false);
    });

    // Offer received
    socket.on('webrtc:offer', async ({ fromUserId, roomId, offer }: any) => {
      let pc = pcRef.current;
      if (!pc) {
        pc = createPeerConnection(fromUserId, roomId);
      }
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('webrtc:answer', { toUserId: fromUserId, roomId, answer });
      }
    });

    // Answer received
    socket.on('webrtc:answer', async ({ answer }: any) => {
      if (pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    // ICE Candidate received
    socket.on('webrtc:ice-candidate', async ({ candidate }: any) => {
      if (pcRef.current && candidate) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('ICE candidate error:', err);
        }
      }
    });

    // Call Ended listener
    socket.on('webrtc:call-ended', () => {
      endCall(false);
    });

    return () => {
      socket.off('webrtc:call-incoming');
      socket.off('webrtc:call-accepted');
      socket.off('webrtc:call-rejected');
      socket.off('webrtc:offer');
      socket.off('webrtc:answer');
      socket.off('webrtc:ice-candidate');
      socket.off('webrtc:call-ended');
    };
  }, [callState, callerInfo, createPeerConnection, endCall]);

  return {
    callState,
    callerInfo,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    isScreenSharing,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
  };
}
