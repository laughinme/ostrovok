import { describe, expect, it } from "vitest";
import { demoPhotos, hotelPhotos, photoInfo } from "./photos";
import catalog from "../api/photo-catalog.json";

describe("bundled hotel galleries", () => {
  it("covers the whole OSM catalog and resolves the same gallery by stable booking ID", () => {
    expect(Object.keys(catalog.hotels)).toHaveLength(200);
    for (const [osmId, hotel] of Object.entries(catalog.hotels)) {
      const images = hotelPhotos(osmId);
      expect(images.length).toBeGreaterThanOrEqual(3);
      expect(new Set(images).size).toBe(images.length);
      expect(hotelPhotos(hotel.id)).toEqual(images);
      expect(images.every((src) => photoInfo(src))).toBe(true);
    }
  });

  it("keeps a verified cover first and labels synthetic additions individually", () => {
    const gallery = hotelPhotos("node/10118233110");
    expect(photoInfo(gallery[0])).toMatchObject({ kind: "photo", license: "CC BY-SA 4.0" });
    expect(photoInfo(gallery[1])?.kind).toBe("photo");
    expect(photoInfo(gallery[2])).toMatchObject({
      kind: "ai",
      license: null,
      label: "AI-иллюстрация",
    });
  });

  it("distinguishes a complex panorama from a photograph of a specific hotel", () => {
    expect(photoInfo(hotelPhotos("node/4601243304")[0])?.label).toBe("Фото комплекса");
  });

  it("never assigns real hotel photographs to a fictional demo or unknown object", () => {
    expect(hotelPhotos("demo-zakatny-bereg")).toEqual(demoPhotos("zakatny-bereg"));
    expect(demoPhotos("zakatny-bereg").every((src) => photoInfo(src)?.kind === "ai")).toBe(true);
    expect(hotelPhotos("way/unknown")).toEqual([]);
    expect(photoInfo("/unknown.jpg")).toBeUndefined();
  });

  it("provides attribution and original license links for every real photograph", () => {
    for (const item of Object.values(catalog.assets)) {
      if (item.kind === "ai") {
        expect(item.license).toBeNull();
      } else {
        expect(item.author).not.toBe("");
        expect(item.page).toMatch(/^https:\/\/commons\.wikimedia\.org\//);
        expect(item.licenseUrl).toMatch(/^https?:\/\/creativecommons\.org\//);
      }
    }
  });
});
