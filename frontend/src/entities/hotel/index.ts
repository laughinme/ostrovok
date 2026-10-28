export { getHotel, hotels } from "./api/demo-hotels";
export {
  catalogQuery,
  hotelQuery,
  hotelFromApi,
  factFromApi,
  criterionKeys,
} from "./api/backend-hotels";
export type { ApiHotel, ApiFact, ApiMatch, ApiIntent } from "./api/backend-hotels";
export { CRITERIA } from "./config/criteria";
export type { Criterion, Fact, FactStatus, Hotel } from "./model/types";
export { formatReviewCount } from "./model/format-review-count";
export { Beam } from "./ui/confidence-beam";
export { Price } from "./ui/price";
export { RatingBadge } from "./ui/rating-badge";
export { StatusPill } from "./ui/status-pill";
