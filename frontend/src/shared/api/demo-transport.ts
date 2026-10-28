export type ApiOptions = {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
  token?: string;
  headers?: Record<string, string>;
};
export type DemoTransport = (path: string, options: ApiOptions) => Promise<unknown>;

let transport: DemoTransport | undefined;

export function registerDemoTransport(handler: DemoTransport | undefined) {
  transport = handler;
}

export function getDemoTransport() {
  return transport;
}
