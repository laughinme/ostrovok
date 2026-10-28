const tasks = new Set<symbol>();
const listeners = new Set<() => void>();

export function beginLoadingTask() {
  const task = Symbol();
  tasks.add(task);
  listeners.forEach((listener) => listener());
  return () => {
    if (!tasks.delete(task)) return;
    listeners.forEach((listener) => listener());
  };
}

export const getLoadingTaskCount = () => tasks.size;
export const getServerLoadingTaskCount = () => 0;
export function subscribeLoadingTasks(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
