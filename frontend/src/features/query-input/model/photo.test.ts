import { describe, expect, it } from "vitest";
import { MAX_PHOTO_BYTES, photoDimensions, validatePhoto } from "./photo";

describe("подготовка фото", () => {
  it.each(["image/jpeg", "image/png", "image/webp"])("принимает %s до 5 МБ", (type) => {
    expect(validatePhoto({ type, size: MAX_PHOTO_BYTES })).toBeUndefined();
  });
  it("отклоняет пустые, большие и неподдерживаемые файлы", () => {
    expect(validatePhoto({ type: "image/jpeg", size: 0 })).toContain("пустой");
    expect(validatePhoto({ type: "image/png", size: MAX_PHOTO_BYTES + 1 })).toContain("5 МБ");
    expect(validatePhoto({ type: "image/svg+xml", size: 100 })).toContain("JPG");
  });
  it("уменьшает длинную сторону до 1024 без искажений и увеличения", () => {
    expect(photoDimensions(4000, 2000)).toEqual({ width: 1024, height: 512 });
    expect(photoDimensions(1000, 4000)).toEqual({ width: 256, height: 1024 });
    expect(photoDimensions(320, 240)).toEqual({ width: 320, height: 240 });
  });
});
