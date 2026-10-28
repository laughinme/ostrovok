import { useEffect, useRef, useState } from "react";
import { createSpeechSession, speechConstructor } from "./speech";

export function useVoiceInput(query: string, onQuery: (value: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string>();
  const session = useRef<ReturnType<typeof createSpeechSession> | null>(null);
  useEffect(() => {
    setSupported(Boolean(speechConstructor()));
    return () => session.current?.dispose();
  }, []);
  const cancel = () => {
    session.current?.dispose();
    session.current = null;
    setListening(false);
    setError(undefined);
  };
  return {
    supported,
    listening,
    error,
    cancel,
    toggle() {
      if (session.current) {
        session.current.stop();
        return;
      }
      const Constructor = speechConstructor();
      if (!Constructor) return;
      setError(undefined);
      setListening(true);
      session.current = createSpeechSession(Constructor, query, onQuery, (message) => {
        session.current?.dispose();
        session.current = null;
        setListening(false);
        setError(message);
      });
      session.current.start();
    },
  };
}
