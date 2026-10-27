import { HOTELS } from '@/entities/hotel/server';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const hotel = HOTELS.find((item) => item.id === id);
  return hotel ? Response.json(hotel) : Response.json({ message: 'Hotel not found' }, { status: 404 });
}
