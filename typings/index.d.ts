import {Filter, RdbClientBase} from '../core';
export * from '../core';

export interface RdbStatic {
    (baseUrl: string, options?: any): RdbClient;
    (db: object, options?: any): RdbClient;
    filter: Filter;
}      

export interface RdbClient extends RdbClientBase {    
}

declare const rdbClient: RdbStatic;
export default rdbClient;