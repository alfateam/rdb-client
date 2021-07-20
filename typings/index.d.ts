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

  export enum Concurrencies {
    Optimistic = 'optimistic',
    SkipOnConflict = 'skipOnConflict',
    Overwrite = 'overwrite'
  }

  export interface BooleanColumn extends ColumnBase<boolean> {
  }

  export interface JSONColumn extends ColumnBase<object> {
  }

  export interface UUIDColumn extends ColumnBase<string> {
  }

  export interface DateColumn extends ColumnBase2<Date, string> {
  }

  export interface NumberColumn extends ColumnBase<number> {
  }

  export interface BinaryColumn extends ColumnBase<any> {

  }

  export interface StringColumn extends ColumnBase<string> {
      startsWith(value: string | null): import('rdb-client').Filter;
      /**
       * ignore case
       */
      iStartsWith(value: string | null): import('rdb-client').Filter;
      endsWith(value: string | null): import('rdb-client').Filter;
      /**
       * ignore case
       */
      iEndsWith(value: string | null): import('rdb-client').Filter;
      contains(value: string | null): import('rdb-client').Filter;
      /**
       * ignore case
       */
      iContains(value: string | null): import('rdb-client').Filter;
      /**
       * ignore case
       */
      iEqual(value: string | null): import('rdb-client').Filter;
      /**
       * equal, ignore case
       */
      iEq(value: string | null): import('rdb-client').Filter;
      /**
       * equal, ignore case
       */
      EQ(value: string | null): import('rdb-client').Filter;
      /**
       * equal, ignore case
       */
      iEq(value: string | null): import('rdb-client').Filter;
  }


  interface ColumnBase<TType> {
      equal(value: TType | null): import('rdb-client').Filter;
      /**
       * equal
       */
      eq(value: TType | null): import('rdb-client').Filter;
      notEqual(value: TType | null): import('rdb-client').Filter;
      /**
       * not equal
       */
      ne(value: TType | null): import('rdb-client').Filter;
      lessThan(value: TType | null): import('rdb-client').Filter;
      /**
       * less than
       */
      lt(value: TType | null): import('rdb-client').Filter;
      lessThanOrEqual(value: TType | null): import('rdb-client').Filter;
      /**
       * less than or equal
       */
      le(value: TType | null): import('rdb-client').Filter;
      greaterThan(value: TType | null): import('rdb-client').Filter;
      /**
       * greater than
       */
      gt(value: TType | null): import('rdb-client').Filter;
      greaterThanOrEqual(value: TType | null): import('rdb-client').Filter;
      /**
       * greater than or equal
       */
      ge(value: TType | null): import('rdb-client').Filter;
      between(from: TType, to: TType | null): import('rdb-client').Filter;
      in(values: TType[] | null): import('rdb-client').Filter;
  }

  interface ColumnBase2<TType, TType2> {
      equal(value: TType2 | null): import('rdb-client').Filter;
      equal(value: TType | null): import('rdb-client').Filter;
      /**
       * equal
       */
      eq(value: TType2 | null): import('rdb-client').Filter;
      eq(value: TType | null): import('rdb-client').Filter;
      notEqual(value: TType2 | null): import('rdb-client').Filter;
      notEqual(value: TType | null): import('rdb-client').Filter;
      /**
       * not equal
       */
      ne(value: TType2 | null): import('rdb-client').Filter;
      ne(value: TType | null): import('rdb-client').Filter;
      lessThan(value: TType2 | null): import('rdb-client').Filter;
      lessThan(value: TType | null): import('rdb-client').Filter;
      /**
       * less than
       */
      lt(value: TType2 | null): import('rdb-client').Filter;
      lt(value: TType | null): import('rdb-client').Filter;
      lessThanOrEqual(value: TType2 | null): import('rdb-client').Filter;
      lessThanOrEqual(value: TType | null): import('rdb-client').Filter;
      /**
       * less than or equal
       */
      le(value: TType2 | null): import('rdb-client').Filter;
      le(value: TType | null): import('rdb-client').Filter;
      greaterThan(value: TType2 | null): import('rdb-client').Filter;
      greaterThan(value: TType | null): import('rdb-client').Filter;
      /**
       * greater than
       */
      gt(value: TType2 | null): import('rdb-client').Filter;
      gt(value: TType | null): import('rdb-client').Filter;
      greaterThanOrEqual(value: TType2 | null): import('rdb-client').Filter;
      greaterThanOrEqual(value: TType | null): import('rdb-client').Filter;
      /**
       * greater than or equal
       */
      ge(value: TType2 | null): import('rdb-client').Filter;
      ge(value: TType | null): import('rdb-client').Filter;
      between(from: TType2, to: TType | null): import('rdb-client').Filter;
      between(from: TType, to: TType | null): import('rdb-client').Filter;
      in(values: TType2[] | null): import('rdb-client').Filter;
      in(values: TType[] | null): import('rdb-client').Filter;
  }


}