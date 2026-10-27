export type Verdict = 'yes' | 'partial' | 'no' | 'unknown';
export type SourceKind = 'computed' | 'open_data' | 'hotelier' | 'guest' | 'demo_card';
export type Facade = 'NE' | 'SE' | 'SW' | 'NW';
export type Importance = 'must' | 'important' | 'nice';
export type Checkable = 'compute' | 'ask_hotelier' | 'cannot';


export const MARK: Record<Verdict, string> = { yes: '✓', partial: '⚠', no: '✗', unknown: '?' };
