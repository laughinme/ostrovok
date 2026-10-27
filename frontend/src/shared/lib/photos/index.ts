import PHOTOS from '@/shared/lib/photos/photos.json';

export interface PhotoMeta { src: string; title: string; author: string; license: string; licenseUrl: string; page: string }

const table = PHOTOS as Record<string, PhotoMeta>;

export const photo = (key: string): PhotoMeta | null => table[key] ?? null;
export const allPhotos = () => Object.entries(table);
