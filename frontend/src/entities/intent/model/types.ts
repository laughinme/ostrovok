import type { Importance, Checkable } from '@/shared/model';

export interface Characteristic {
  key: string;
  label: string;
  checkable: Checkable;
  how: string;
}

export interface IntentChip {
  key: string;
  importance: Importance;
}

