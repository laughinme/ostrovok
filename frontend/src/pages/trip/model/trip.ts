import photo from "../assets/mayak.jpg";
import { hotels } from "@/entities/hotel";

export interface TripHotel {
  name: string;
  photos: string[];
  bestFacade: "NE" | "SE" | "SW" | "NW" | null;
  bestRoom: string;
  rooms: { name: string; recommended: boolean; request: string }[];
}
export interface TripRecord {
  id: string;
  hotel: TripHotel;
  hotelId?: string;
  bookingId?: string;
  destination: string;
  checkIn: string;
  checkOut: string;
  guests: string;
  status: "confirmed" | "requested" | "completed" | "alternative_offered" | "declined";
  room: string | null;
  floor: number | null;
  highlights: { label: string; value: string; description: string }[];
}
export const trip = {
  hotel: {
    name: "Маяк",
    photos: [photo],
    bestFacade: "SW" as const,
    bestRoom: "Делюкс с видом на море",
    rooms: [
      {
        name: "Делюкс с видом на море",
        recommended: true,
        request: "Юго-западная сторона · от 4 этажа · подальше от лифта",
      },
    ],
  },
};
const mountain = hotels.find((hotel) => hotel.id === "gornyi-priyut") ?? hotels[3]!;
const palm = hotels.find((hotel) => hotel.id === "palmovyi-sad") ?? hotels[5]!;
function fromHotel(
  hotel: typeof mountain,
  facade: TripHotel["bestFacade"],
  room: string,
): TripHotel {
  return {
    name: hotel.name,
    photos: hotel.gallery,
    bestFacade: facade,
    bestRoom: room,
    rooms: [
      {
        name: room,
        recommended: true,
        request:
          facade === "NE" ? "Вид на горы · тихая сторона" : "Вид на море · подальше от лифта",
      },
    ],
  };
}
export const demoTrips: TripRecord[] = [
  {
    id: "OKN-1015",
    hotel: trip.hotel,
    destination: "Сочи",
    checkIn: "2026-11-10",
    checkOut: "2026-11-15",
    guests: "2 взрослых",
    status: "confirmed",
    room: "512",
    floor: 5,
    highlights: [
      {
        label: "Закат из окна",
        value: "16:58",
        description: "Юго-западная сторона. Солнце садится над морем.",
      },
      {
        label: "Ваш номер",
        value: "512",
        description: "Пятый этаж, подальше от лифта. Пожелания подтверждены в примере.",
      },
      {
        label: "До пляжа",
        value: "6 минут",
        description: "Спуск по лестнице. Обратно дорога займёт чуть дольше.",
      },
    ],
  },
  {
    id: "OKN-2225",
    hotel: fromHotel(mountain, "NE", "Делюкс с видом на горы"),
    hotelId: `demo-${mountain.id}`,
    destination: "Красная Поляна",
    checkIn: "2026-11-22",
    checkOut: "2026-11-25",
    guests: "2 взрослых",
    status: "requested",
    room: null,
    floor: null,
    highlights: [
      {
        label: "Вид из окна",
        value: "Горы",
        description: "Запросили номер с видом на горный хребет.",
      },
      {
        label: "Размещение",
        value: "Уточняем",
        description: "Отель ещё не подтвердил этаж и номер.",
      },
      {
        label: "Для работы",
        value: "Wi-Fi",
        description: "Наличие рабочего места включили в пожелания.",
      },
    ],
  },
  {
    id: "OKN-0308",
    hotel: fromHotel(palm, "SW", "Семейный номер с балконом"),
    hotelId: `demo-${palm.id}`,
    destination: "Сириус",
    checkIn: "2026-09-03",
    checkOut: "2026-09-08",
    guests: "2 взрослых и ребёнок",
    status: "completed",
    room: "304",
    floor: 3,
    highlights: [
      { label: "Море рядом", value: "1 минута", description: "Семейный отдых на первой линии." },
      { label: "Ваш номер", value: "304", description: "Третий этаж и балкон с видом на море." },
      {
        label: "Впечатления",
        value: "Как всё прошло?",
        description: "Расскажите, совпал ли отдых с ожиданиями.",
      },
    ],
  },
];
