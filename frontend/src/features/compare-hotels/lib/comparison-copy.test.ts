import { describe, expect, it } from "vitest";
import { comparisonCopy } from "./comparison-copy";

describe("comparisonCopy", () => {
  it("strips leading status symbols and formats verbose sea view statements", () => {
    expect(comparisonCopy("✓ море видно из окон · фасады ЮВ и ЮЗ")).toBe("Вид на море (ЮВ, ЮЗ)");
  });

  it("shortens work quiet statements to punchy bullet", () => {
    expect(comparisonCopy("✓ тихо днём — можно спокойно поработать")).toBe("Тихо днём для работы");
  });

  it("formats noise and single facade scope", () => {
    expect(comparisonCopy("✕ ночью шумно · ЮЗ-фасад")).toBe("Шумно ночью (ЮЗ)");
  });

  it("formats sunset and quiet statements", () => {
    expect(comparisonCopy("✓ закат над морем виден из окон · ЮЗ-фасад")).toBe(
      "Закат над морем (ЮЗ)",
    );
    expect(comparisonCopy("✓ ночью тихо · фасады ЮВ и ЮЗ")).toBe("Тихо ночью (ЮВ, ЮЗ)");
  });

  it("formats walk to beach statements", () => {
    expect(comparisonCopy("до пляжа 5 мин пешком, обратно 6 мин · подъём 7 м")).toBe(
      "Пляж ~5 мин пешком",
    );
  });
});
