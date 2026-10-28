import photo from "../assets/mayak.jpg";

export const trip = {
  hotel: {
    name: "Маяк",
    photos: [photo],
    bestFacade: "SW" as const,
    bestRoom: "Делюкс, ЮЗ ≥ 4 эт.",
    rooms: [
      {
        name: "Делюкс с видом на море",
        recommended: true,
        request: "ЮЗ-сторона · этаж ≥ 4 · подальше от лифта",
      },
    ],
  },
};

export type TripHotel = typeof trip.hotel;
