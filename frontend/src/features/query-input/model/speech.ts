export type SpeechResult = ArrayLike<{ transcript: string }>;
export type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<SpeechResult> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};
export type RecognitionConstructor = new () => Recognition;

export function speechConstructor(): RecognitionConstructor | undefined {
  if (typeof window === "undefined") return;
  const browser = window as unknown as {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
}

export function appendSpeech(base: string, results: ArrayLike<SpeechResult>): string {
  const spoken = Array.from(results, (result) => result[0]?.transcript.trim() ?? "")
    .filter(Boolean)
    .join(" ");
  return [base.trim(), spoken].filter(Boolean).join(" ");
}

export function speechError(error: string): string {
  if (error === "not-allowed" || error === "service-not-allowed")
    return "Нет доступа к микрофону. Разрешите его в настройках браузера или напишите желание.";
  if (error === "audio-capture") return "Микрофон не найден. Подключите его или напишите желание.";
  if (error === "no-speech")
    return "Не удалось расслышать. Нажмите на микрофон и попробуйте ещё раз.";
  if (error === "network")
    return "Не удалось распознать речь. Проверьте интернет или напишите желание.";
  return "Голосовой ввод не сработал. Попробуйте ещё раз или напишите желание.";
}

export function createSpeechSession(
  Constructor: RecognitionConstructor,
  base: string,
  onText: (text: string) => void,
  onEnd: (error?: string) => void,
) {
  const recognition = new Constructor();
  recognition.lang = "ru-RU";
  recognition.interimResults = true;
  recognition.continuous = true;
  let active = true;
  recognition.onresult = ({ results }) => {
    if (active) onText(appendSpeech(base, results));
  };
  const finish = (error?: string) => {
    if (!active) return;
    active = false;
    onEnd(error);
  };
  recognition.onerror = ({ error }) => finish(error === "aborted" ? undefined : speechError(error));
  recognition.onend = () => finish();
  return {
    start() {
      try {
        recognition.start();
      } catch {
        finish(speechError("start"));
      }
    },
    stop() {
      recognition.stop();
    },
    dispose() {
      active = false;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.abort();
    },
  };
}
