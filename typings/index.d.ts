import {RdbClientBase, RawFilter, Filter, Concurrencies} from '../core';
export * from './core';

export interface RdbClient extends RdbClientBase {
    customer: CustomerTable;
    order: OrderTable;
}

export interface RdbStatic {
    (baseUrl: string): RdbClient;
    (db: object): RdbClient;
    filter: Filter;
}      

declare const rdbClient: RdbStatic;
export default rdbClient;