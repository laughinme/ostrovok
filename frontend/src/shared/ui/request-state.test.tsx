import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RequestState } from "./request-state";

describe("request loading scope", () => {
  it("renders local loading feedback by default without a full-page task", () => {
    const html = renderToStaticMarkup(<RequestState pending />);
    expect(html).toContain('role="status"');
    expect(html).toContain("Загружаем…");
    expect(html).not.toContain('role="dialog"');
  });
  it("reserves the full-screen loading signal for explicit page loads", () => {
    expect(renderToStaticMarkup(<RequestState pending page />)).toBe("");
    expect(renderToStaticMarkup(<RequestState />)).toBe("");
  });
  it("replaces page loading with a recoverable error", () => {
    const html = renderToStaticMarkup(
      <RequestState pending page error={new Error("Нет соединения")} retry={() => {}} />,
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain("Попробовать снова");
  });
});
