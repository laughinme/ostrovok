import { describe, expect, it } from "vitest";
import { appendSpeech, createSpeechSession, speechError, type Recognition } from "./speech";

class FakeRecognition implements Recognition {
  static latest: FakeRecognition;
  lang = "";
  interimResults = false;
  continuous = false;
  onresult: Recognition["onresult"] = null;
  onerror: Recognition["onerror"] = null;
  onend: Recognition["onend"] = null;
  stopped = false;
  aborted = false;
  constructor() {
    FakeRecognition.latest = this;
  }
  start() {}
  stop() {
    this.stopped = true;
    this.onend?.();
  }
  abort() {
    this.aborted = true;
  }
}

describe("голосовой ввод", () => {
  it("дописывает речь к исходному запросу и заменяет промежуточный результат", () => {
    expect(appendSpeech("У моря", [[{ transcript: "и тиш" }]])).toBe("У моря и тиш");
    expect(appendSpeech("У моря", [[{ transcript: "и тишина" }]])).toBe("У моря и тишина");
    expect(appendSpeech("", [[{ transcript: "Закат" }], [{ transcript: "в окне" }]])).toBe(
      "Закат в окне",
    );
  });
  it("настраивает русский язык, промежуточные результаты и остановку", () => {
    const texts: string[] = [];
    let ended = 0;
    const session = createSpeechSession(
      FakeRecognition,
      "Хочу",
      (text) => texts.push(text),
      () => ended++,
    );
    session.start();
    const recognition = FakeRecognition.latest;
    expect([recognition.lang, recognition.interimResults, recognition.continuous]).toEqual([
      "ru-RU",
      true,
      true,
    ]);
    recognition.onresult?.({ results: [[{ transcript: "море" }]] });
    session.stop();
    recognition.onresult?.({ results: [[{ transcript: "поздно" }]] });
    expect(texts).toEqual(["Хочу море"]);
    expect(recognition.stopped).toBe(true);
    expect(ended).toBe(1);
  });
  it("показывает отказ и отключает обработчики при уходе", () => {
    const errors: (string | undefined)[] = [];
    const session = createSpeechSession(
      FakeRecognition,
      "",
      () => {},
      (error) => errors.push(error),
    );
    const recognition = FakeRecognition.latest;
    recognition.onerror?.({ error: "not-allowed" });
    recognition.onend?.();
    expect(errors).toEqual([speechError("not-allowed")]);
    session.dispose();
    expect(recognition.aborted).toBe(true);
    expect(recognition.onresult).toBeNull();
  });
  it.each(["audio-capture", "no-speech", "network", "unknown"])("объясняет ошибку %s", (code) => {
    expect(speechError(code)).toMatch(/микрофон|Микрофон|расслышать|интернет|Голосовой/);
  });
});
