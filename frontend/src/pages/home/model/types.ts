export type Importance = "must" | "important" | "nice";
export interface IntentChip {
  key: string;
  importance: Importance;
}
export interface Characteristic {
  key: string;
  label: string;
  checkable: "compute" | "ask_hotelier" | "cannot";
  how: string;
}
export type HomeBackground = "globe" | "city";
