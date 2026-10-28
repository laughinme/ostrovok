import { useEffect, useRef, useState } from "react";
export function useToast() {
  const [text, setText] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const show = (value: string) => {
    setText(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setText(null), 2800);
  };
  return [text, show] as const;
}
