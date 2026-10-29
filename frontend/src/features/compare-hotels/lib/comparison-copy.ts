import { CRITERIA, criterionKeys, type Criterion } from "@/entities/hotel";

export function comparisonCopy(text: string): string {
  let result = text.trim();

  result = result.replace(/^[✓✕✗?xX!–—\-\s]+/u, "");

  for (const criterion of Object.keys(CRITERIA) as Criterion[]) {
    result = result.replace(
      new RegExp(`\\b(?:${criterionKeys[criterion]}|${criterion})\\b`, "gi"),
      CRITERIA[criterion].short,
    );
  }

  result = result
    .replace(/море видно из окон/gi, "Вид на море")
    .replace(/моря из окон не видно/gi, "Без вида на море")
    .replace(/закат над морем виден из окон/gi, "Закат над морем")
    .replace(/заката над морем из окон не видно/gi, "Без вида на закат")
    .replace(/рассвет виден из окон/gi, "Рассвет из окон")
    .replace(/рассвета из окон не видно/gi, "Без вида на рассвет")
    .replace(/горы видны из окон/gi, "Вид на горы")
    .replace(/гор из окон не видно/gi, "Без вида на горы")
    .replace(/тихо днём\s*[—–-]\s*можно спокойно поработать/gi, "Тихо днём для работы")
    .replace(/ночью шумно/gi, "Шумно ночью")
    .replace(/ночью тихо/gi, "Тихо ночью")
    .replace(/днём шумно/gi, "Шумно днём")
    .replace(/днём тихо/gi, "Тихо днём")
    .replace(/до моря можно дойти с коляской без ступеней/gi, "До моря без ступеней")
    .replace(/с коляской до моря без ступеней не дойти/gi, "До моря со ступенями")
    .replace(
      /до пляжа (\d+(?:[.,]\d+)?)\s*мин пешком(?:, обратно [^·]+)?(?:\s*·\s*подъём \d+\s*м)?/gi,
      "Пляж ~$1 мин пешком",
    );

  result = result.replace(/\s*·\s*(?:фасады|фасад)\s+([А-Яа-яA-Za-z\s,и]+)/gi, " ($1)");
  result = result.replace(/\s*·\s*([А-Яа-яA-Za-z]+)-(?:фасад|сторона)/gi, " ($1)");
  result = result.replace(
    /\(([^)]+)\)/g,
    (_, m: string) => `(${m.replace(/\s+и\s+/g, ", ").trim()})`,
  );

  result = result
    .replace(/\s+в демо[-– ]сценарии/giu, "")
    .replace(/:\s*демонстрационное состояние/giu, "")
    .replace(/Демонстрационный подбор для проверки интерфейса[.!]?/giu, "")
    .trim();

  if (result.length > 0) {
    result = result.charAt(0).toUpperCase() + result.slice(1);
  }

  return result;
}
