import {Filter, RdbClientBase} from '../core';
export * from '../core';

export interface RdbStatic {
    (baseUrl: string): RdbClient;
    (db: object): RdbClient;
    filter: Filter;
}      

export interface RdbClient extends RdbClientBase {    
}

declare const rdbClient: RdbStatic;
export default rdbClient;