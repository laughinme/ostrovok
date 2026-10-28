export function apiErrorMessage(status: number, detail: unknown): string {
  if (status === 429) return "Слишком много запросов. Подождите минуту и попробуйте снова.";
  if (status >= 500) return "Сервис временно недоступен. Попробуйте ещё раз через минуту.";
  if (status === 422)
    return "Проверьте запрос: от 1 до 2000 символов, корректные даты и число гостей.";
  return typeof detail === "string"
    ? detail
    : `Не удалось выполнить запрос (${status}). Попробуйте ещё раз.`;
}
