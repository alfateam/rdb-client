interface RdbClient {
  beforeResponse(callback: (response: Response, options: ResponseOptions) => Promise<void> | void): void;
  beforeRequest(callback: (request: RdbRequest) => Promise<RdbRequest> | RdbRequest | Promise<void> | void): void;
  table<TTable>(path: string): TTable;
  filter: Filter;
  or(): Filter;
  and(): Filter;
  not(): Filter;
  const(): Filter;
  reactive(proxyMethod: (obj: any) => any): void;
}


export interface RawFilter {
  sql: string | (() => string);
  parameters?: any[];
}

export interface Filter extends RawFilter {
  and(filter: Filter, ...filters: Filter[]): Filter;
  or(filter: Filter, ...filters: Filter[]): Filter;
  not(): Filter;
}


export interface ResponseOptions {
  retry(): void;
  attempts: number;
}


export interface RdbRequest {
  method: string;
  headers: Headers;
  body: any;
}

declare const rdbClient : RdbClient;
export default rdbClient;