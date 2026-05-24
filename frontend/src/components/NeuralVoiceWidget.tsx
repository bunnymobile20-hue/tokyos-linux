import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Cloud, Server } from 'lucide-react';
import './NeuralVoiceWidget.css';

export const NeuralVoiceWidget: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [useCloud, setUseCloud] = useState(false);
  const [statusText, setStatusText] = useState('Standby');
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    // Connect to WebSocket when widget mounts
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    wsRef.current = new WebSocket(`${protocol}//${host}/api/system/voice-stream`);

    wsRef.current.onopen = () => {
      console.log('Voice WebSocket connected');
    };

    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'text') {
          setStatusText(data.text);
        }
      } catch (e) {
        console.error('Failed to parse WS message', e);
      }
    };

    return () => {
      wsRef.current?.close();
    };
  }, []);

  const toggleVoice = async () => {
    if (isActive) {
      mediaRecorderRef.current?.stop();
      setIsActive(false);
      setStatusText('Standby');
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(event.data);
          }
        };

        // Collect audio chunks every 500ms
        mediaRecorder.start(500);
        mediaRecorderRef.current = mediaRecorder;
        
        setIsActive(true);
        setStatusText('Ouvindo...');
      } catch (err) {
        console.error('Microphone access denied', err);
        setStatusText('Erro no Microfone');
      }
    }
  };

  return (
    <div className={`neural-voice-widget ${isActive ? 'active' : ''}`}>
      <div className="voice-controls">
        <button className="toggle-mode-btn" onClick={() => setUseCloud(!useCloud)} title={useCloud ? 'Modo Nuvem (API)' : 'Modo Local (Whisper)'}>
          {useCloud ? <Cloud size={16} /> : <Server size={16} />}
          <span>{useCloud ? 'Nuvem' : 'Local'}</span>
        </button>
        <button className={`mic-btn ${isActive ? 'recording' : ''}`} onClick={toggleVoice}>
          {isActive ? <Mic size={24} /> : <MicOff size={24} />}
        </button>
      </div>
      <div className="voice-status">
        <span className="status-indicator"></span>
        {statusText}
      </div>
      {isActive && (
        <div className="waveform-container">
          <div className="bar"></div>
          <div className="bar"></div>
          <div className="bar"></div>
          <div className="bar"></div>
          <div className="bar"></div>
        </div>
      )}
    </div>
  );
};
