import { useEffect, useRef, useState } from "react";

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult:
    | ((event: {
        results: { [index: number]: { [index: number]: { transcript: string } }; length: number };
      }) => void)
    | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  abort: () => void;
};
type VoiceWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};

export function useVoiceInput(onText: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = useRef<Recognition | null>(null);
  const receive = useRef(onText);
  useEffect(() => {
    receive.current = onText;
  }, [onText]);
  useEffect(() => {
    const browser = window as VoiceWindow;
    setSupported(!!(browser.SpeechRecognition ?? browser.webkitSpeechRecognition));
    return () => {
      if (current.current) {
        current.current.onend = null;
        current.current.onresult = null;
        current.current.onerror = null;
        current.current.abort();
      }
    };
  }, []);
  function toggle() {
    if (listening) {
      current.current?.abort();
      return;
    }
    const browser = window as VoiceWindow;
    const Constructor = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
    if (!Constructor) return;
    const recognition = new Constructor();
    recognition.lang = "ru-RU";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) =>
      receive.current(
        Array.from(
          { length: event.results.length },
          (_, index) => event.results[index]?.[0]?.transcript ?? "",
        ).join(" "),
      );
    recognition.onerror = (event) =>
      setError(
        event.error === "not-allowed"
          ? "Разрешите доступ к микрофону в браузере или введите пожелание текстом."
          : "Не удалось распознать речь. Попробуйте ещё раз или введите текст.",
      );
    recognition.onend = () => {
      current.current = null;
      setListening(false);
    };
    current.current = recognition;
    setError(null);
    try {
      recognition.start();
      setListening(true);
    } catch {
      setError("Не удалось включить микрофон.");
    }
  }
  return { supported, listening, error, toggle };
}
