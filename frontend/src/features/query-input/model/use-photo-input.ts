import { useEffect, useRef, useState } from "react";
import { api, ApiError, getApiMode, type components } from "@/shared/api";
import { PHOTO_UNAVAILABLE, preparePhoto } from "./photo";

type PhotoState = {
  status: "idle" | "loading" | "ready" | "error";
  preview?: string | undefined;
  message?: string;
};

export function usePhotoInput(onText: (text: string) => void) {
  const [state, setState] = useState<PhotoState>({ status: "idle" });
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  const clear = () => {
    request.current?.abort();
    request.current = null;
    setState({ status: "idle" });
  };
  return {
    ...state,
    clear,
    async select(file: File) {
      request.current?.abort();
      const controller = new AbortController();
      request.current = controller;
      setState({ status: "loading", message: "Понимаю фото…" });
      let preview: string | undefined;
      try {
        const prepared = await preparePhoto(file);
        if (controller.signal.aborted) return;
        preview = prepared.preview;
        setState({ status: "loading", preview, message: "Понимаю фото…" });
        if (getApiMode() === "demo") throw new ApiError(503, PHOTO_UNAVAILABLE);
        const result = await api<components["schemas"]["PhotoIntentResponse"]>("/intents/photo", {
          method: "POST",
          body: { image: prepared.image, mediaType: prepared.mediaType },
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        onText(result.text);
        setState({
          status: "ready",
          preview,
          message: "Желание по фото готово. Уточните его и нажмите «Подобрать».",
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        const message =
          error instanceof ApiError
            ? error.status === 429
              ? "Слишком много фото за минуту. Подождите немного или опишите желание словами."
              : error.status === 503
                ? PHOTO_UNAVAILABLE
                : error.message
            : error instanceof Error && error.name !== "TimeoutError" && error.name !== "TypeError"
              ? error.message
              : "Не удалось понять фото. Попробуйте ещё раз или опишите желание словами.";
        setState({ status: "error", preview, message });
      }
    },
  };
}
