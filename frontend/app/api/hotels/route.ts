import { HOTELS } from '@/entities/hotel/server';

export function GET() {
  return Response.json(HOTELS);
}
