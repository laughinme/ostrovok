import { afterEach, describe, expect, it } from "vitest";
import {
  beginLoadingTask,
  getLoadingTaskCount,
  getServerLoadingTaskCount,
  subscribeLoadingTasks,
} from "./loading-tasks";

const cleanup: (() => void)[] = [];
afterEach(() => {
  cleanup.splice(0).forEach((finish) => finish());
});

describe("shared loading tasks", () => {
  it("keeps loading until every concurrent task settles and tolerates duplicate cleanup", () => {
    const snapshots: number[] = [];
    cleanup.push(subscribeLoadingTasks(() => snapshots.push(getLoadingTaskCount())));
    const first = beginLoadingTask();
    const second = beginLoadingTask();
    cleanup.push(first, second);
    first();
    first();
    expect(getLoadingTaskCount()).toBe(1);
    second();
    expect(getLoadingTaskCount()).toBe(0);
    expect(snapshots).toEqual([1, 2, 1, 0]);
  });

  it("does not notify an unmounted subscriber", () => {
    let notifications = 0;
    const unsubscribe = subscribeLoadingTasks(() => notifications++);
    const finish = beginLoadingTask();
    cleanup.push(finish, unsubscribe);
    unsubscribe();
    finish();
    expect(notifications).toBe(1);
    expect(getLoadingTaskCount()).toBe(0);
  });

  it("keeps the server snapshot independent from client tasks", () => {
    cleanup.push(beginLoadingTask());
    expect(getLoadingTaskCount()).toBe(1);
    expect(getServerLoadingTaskCount()).toBe(0);
  });
});
