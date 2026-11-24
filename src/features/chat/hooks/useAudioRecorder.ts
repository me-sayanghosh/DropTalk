'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export interface AudioRecorderState {
  isRecording: boolean;
  recordingDuration: number;
  waveformAmplitudes: number[];
  audioBlob: Blob | null;
  startRecording: () => Promise<boolean>;
  stopRecording: () => Promise<Blob | null>;
  cancelRecording: () => void;
}

export function useAudioRecorder(): AudioRecorderState {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [waveformAmplitudes, setWaveformAmplitudes] = useState<number[]>([]);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const cleanupAudioNodes = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanupAudioNodes();
    };
  }, [cleanupAudioNodes]);

  const startRecording = useCallback(async (): Promise<boolean> => {
    try {
      if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        console.warn('MediaDevices API not supported in this browser');
        return false;
      }

      cleanupAudioNodes();
      audioChunksRef.current = [];
      setWaveformAmplitudes([]);
      setRecordingDuration(0);
      setAudioBlob(null);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Select supported audio mimeType
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        } else {
          mimeType = '';
        }
      }

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Set up AudioContext for live frequency visualizer
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          audioContextRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          source.connect(analyser);
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateAmplitudes = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);

            // Compute normalized average amplitude
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / (dataArray.length * 255);
            const normalized = Math.max(0.1, Math.min(1.0, avg * 2.5));

            setWaveformAmplitudes((prev) => {
              const next = [...prev, normalized];
              return next.length > 28 ? next.slice(next.length - 28) : next;
            });

            animFrameRef.current = requestAnimationFrame(updateAmplitudes);
          };
          updateAmplitudes();
        }
      } catch (err) {
        console.warn('Web Audio API analysis error:', err);
      }

      recorder.start(100);
      setIsRecording(true);

      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

      return true;
    } catch (err: any) {
      console.error('[audio recorder] start failed:', err.message);
      cleanupAudioNodes();
      setIsRecording(false);
      return false;
    }
  }, [cleanupAudioNodes]);

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        cleanupAudioNodes();
        setIsRecording(false);
        resolve(null);
        return;
      }

      recorder.onstop = () => {
        const mime = recorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mime });
        setAudioBlob(blob);
        cleanupAudioNodes();
        setIsRecording(false);
        resolve(blob);
      };

      recorder.stop();
    });
  }, [cleanupAudioNodes]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    cleanupAudioNodes();
    audioChunksRef.current = [];
    setAudioBlob(null);
    setRecordingDuration(0);
    setWaveformAmplitudes([]);
    setIsRecording(false);
  }, [cleanupAudioNodes]);

  return {
    isRecording,
    recordingDuration,
    waveformAmplitudes,
    audioBlob,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}

export default useAudioRecorder;
