
import {RdbClientBase, RawFilter, Filter, Concurrencies} from '../core';
export * from '../core';

export interface RdbStatic {
    (baseUrl: string): RdbClient;
    (db: object): RdbClient;
    filter: Filter;
}      

declare const rdbClient: RdbStatic;
export default rdbClient;

export interface RdbClient extends RdbClientBase {    
}
    