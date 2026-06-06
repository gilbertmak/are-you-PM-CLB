import { useMemo, useRef, useState } from 'react';

interface PronunciationRecorderProps {
  termId: string;
  promptText: string;
  onAttempt: (score: 'good' | 'needs-practice', note?: string) => void;
}

function supportsRecording() {
  return typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== 'undefined';
}

export function PronunciationRecorder({ termId, promptText, onAttempt }: PronunciationRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const [status, setStatus] = useState(supportsRecording() ? 'Record yourself, replay, then rate the pronunciation.' : 'Recording is unavailable in this browser.');
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const canRecord = useMemo(() => supportsRecording(), []);

  const startRecording = async () => {
    if (!canRecord) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream);
    recorderRef.current = recorder;
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunksRef.current.push(event.data);
    };
    recorder.onstop = async () => {
      stream.getTracks().forEach((track) => track.stop());
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      const nextAudioUrl = URL.createObjectURL(blob);
      setAudioUrl(nextAudioUrl);
      setStatus('Recording ready. If a backend is configured, feedback is requested in the background.');

      const form = new FormData();
      form.append('termId', termId);
      form.append('promptText', promptText);
      form.append('audio', blob, `${termId.replace(/[^a-z0-9-]+/gi, '_')}.webm`);
      fetch('/api/pronunciation/score', { method: 'POST', body: form })
        .then((response) => (response.ok ? response.json() : null))
        .then((payload: { feedback?: string } | null) => {
          if (payload?.feedback) setStatus(payload.feedback);
        })
        .catch(() => undefined);
    };
    recorder.start();
    setRecording(true);
    setStatus('Recording… speak the Mandarin prompt clearly.');
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  };

  return (
    <div className="recorder-box">
      <div className="recorder-actions">
        <button className="btn btn-neutral" disabled={!canRecord || recording} onClick={startRecording} type="button">Start recording</button>
        <button className="btn btn-refresh" disabled={!recording} onClick={stopRecording} type="button">Stop</button>
      </div>
      {audioUrl ? <audio controls src={audioUrl}>Recorded audio playback is unavailable.</audio> : null}
      <p>{status}</p>
      <div className="recorder-actions">
        <button className="tone-rate good" onClick={() => onAttempt('good', status)} type="button">Pronunciation sounded good</button>
        <button className="tone-rate practice" onClick={() => onAttempt('needs-practice', status)} type="button">Needs pronunciation practice</button>
      </div>
    </div>
  );
}
