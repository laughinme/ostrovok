import { useRouterState } from "@tanstack/react-router";
import {
  getLoadingTaskCount,
  getServerLoadingTaskCount,
  subscribeLoadingTasks,
} from "@/shared/lib";
import { useEffect, useState, useSyncExternalStore } from "react";

export function useLoadingActivity() {
  const tasks = useSyncExternalStore(
    subscribeLoadingTasks,
    getLoadingTaskCount,
    getServerLoadingTaskCount,
  );
  const route = useRouterState({
    select: (state) => ({
      path: state.location.pathname,
      query: state.location.search.q,
    }),
  });
  const requested = tasks > 0;
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(requested), requested ? 120 : 0);
    return () => clearTimeout(timer);
  }, [requested]);

  return {
    active: requested && visible,
    query: route.query,
    title: ["/search", "/results"].includes(route.path)
      ? "Подбираем ваш отдых"
      : route.path === "/compare"
        ? "Сравниваем отели"
        : route.path.startsWith("/hotel/")
          ? "Загружаем отель"
          : "Загружаем данные",
  };
}
