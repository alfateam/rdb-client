export = RdbClient;

declare namespace RdbClient {
  export function beforeRequest(callback: (response: Response, options: ResponseOptions) => Promise<void> | void): void;
  export function beforeResponse(callback: (response: Response, options: ResponseOptions) => Promise<void> | void): void;
  export function table<TTable>(path: string): TTable;
  export const filter: Filter;
  export function reactive(proxyMethod: (obj: any) => any): void;

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

  export type RdbRequest = {
    method: string;
    headers: Headers;
    body: any;
  }

  export enum ConcurrencyValues {
    Optimistic = 'optimistic',
    SkipOnConflict = 'skipOnConflict',
    Overwrite = 'overwrite'
  }

}