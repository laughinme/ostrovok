import { beginLoadingTask } from "@/shared/lib";
import { useEffect } from "react";

export function LoadingSignal() {
  useEffect(beginLoadingTask, []);
  return null;
}
