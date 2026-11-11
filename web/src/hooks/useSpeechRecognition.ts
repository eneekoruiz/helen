import { useRef, useState } from 'react';

interface UseSpeechRecognitionProps {
  onTranscript: (text: string) => void;
  onEnd?: () => void;
}

export function useSpeechRecognition({ onTranscript, onEnd }: UseSpeechRecognitionProps) {
  const recognitionRef = useRef<any | null>(null);
  const [isListening, setIsListening] = useState(false);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  function resetSilenceTimeout() {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
    silenceTimeoutRef.current = setTimeout(() => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    }, 1500); // 1.5 seconds of silence
  }

  function clearSilenceTimeout() {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
  }

  function toggleListening() {
    if (typeof window === 'undefined') return;

    const SpeechRecognitionConstructor =
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionConstructor) {
      window.alert('Tu navegador no soporta dictado por voz. Prueba en Chrome o Edge.');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      return;
    }

    const recognition = new SpeechRecognitionConstructor();
    recognition.lang = navigator.language || 'es-ES';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      resetSilenceTimeout();
    };

    recognition.onresult = (event: any) => {
      resetSilenceTimeout();
      let transcript = '';
      for (let index = 0; index < event.results.length; index += 1) {
        transcript += event.results[index][0].transcript;
      }
      onTranscript(transcript.trim());
    };

    recognition.onerror = () => {
      setIsListening(false);
      clearSilenceTimeout();
    };

    recognition.onend = () => {
      setIsListening(false);
      clearSilenceTimeout();
      recognitionRef.current = null;
      if (onEnd) {
        onEnd();
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  function stop() {
    clearSilenceTimeout();
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }

  return { recognitionRef, isListening, toggleListening, stop };
}
