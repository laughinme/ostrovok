import {
  AirVent,
  Baby,
  Building2,
  CookingPot,
  CloudSun,
  Footprints,
  Car,
  FileSearch,
  Laptop,
  MapPin,
  Moon,
  ShowerHead,
  Sun,
  Utensils,
} from "lucide-react";
import type { HotelInfoGroupKey } from "../model/hotel-info-groups";

export const hotelInfoIcons = {
  view: Sun,
  quiet: Moon,
  nearby: MapPin,
  access: Footprints,
  transport: Car,
  weather: CloudSun,
  work: Laptop,
  family: Baby,
  food: Utensils,
  room: AirVent,
  bathroom: ShowerHead,
  kitchen: CookingPot,
  general: Building2,
  other: FileSearch,
} satisfies Record<HotelInfoGroupKey, unknown>;
