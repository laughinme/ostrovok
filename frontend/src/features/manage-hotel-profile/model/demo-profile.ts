import { getHotel } from "@/entities/hotel";
export const hotel = getHotel("kiparisovaya-alleya")!;
export interface Q {
  id: number;
  text: string;
  why: string;
  travelers: number;
  done?: boolean;
}
export const INITIAL_Q: Q[] = [
  {
    id: 1,
    text: "Работает ли лифт к пляжу в октябре?",
    why: "Сайт и 4 свежих отзыва противоречат друг другу",
    travelers: 312,
  },
  {
    id: 2,
    text: "Можно ли остановиться с маленькой собакой в отдельном корпусе?",
    why: "Частый запрос в Хосте, данных нет",
    travelers: 188,
  },
  {
    id: 3,
    text: "Есть ли рабочие столы в номерах 3 этажа?",
    why: "Растёт спрос от удалённых работников",
    travelers: 94,
  },
];

export type Msg = { from: "bot" | "me"; text: string };
