export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const PHOTO_UNAVAILABLE = "Чтобы понять фото, нужен ключ LLM — опишите словами";
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function validatePhoto(file: Pick<File, "type" | "size">): string | undefined {
  if (!PHOTO_TYPES.includes(file.type)) return "Выберите фото в формате JPG, PNG или WebP.";
  if (!file.size) return "Этот файл пустой. Выберите другое фото.";
  if (file.size > MAX_PHOTO_BYTES) return "Фото слишком большое. Выберите файл до 5 МБ.";
  return undefined;
}

export function photoDimensions(width: number, height: number) {
  const scale = Math.min(1, 1024 / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export async function preparePhoto(file: File) {
  const error = validatePhoto(file);
  if (error) throw new Error(error);
  const url = URL.createObjectURL(file);
  const image = new Image();
  try {
    image.src = url;
    await image.decode();
    if (image.naturalWidth * image.naturalHeight > 40_000_000)
      throw new Error("Фото слишком большое по размеру. Выберите снимок до 40 мегапикселей.");
    const canvas = document.createElement("canvas");
    const dimensions = photoDimensions(image.naturalWidth, image.naturalHeight);
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Браузер не смог обработать фото. Опишите желание словами.");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL("image/jpeg", 0.82);
    return { image: data.split(",")[1]!, mediaType: "image/jpeg" as const, preview: data };
  } catch (error) {
    if (error instanceof DOMException)
      throw new Error("Не удалось прочитать фото. Выберите другой JPG, PNG или WebP.");
    throw error;
  } finally {
    URL.revokeObjectURL(url);
  }
}
