import {RdbClientBase, Filter, Config} from '../core';
export * from '../core';

export interface RdbStatic {
    (config: Config): RdbClient;
    filter: Filter;
}      

declare const rdbClient: RdbStatic;
export default rdbClient;

export interface RdbClient extends RdbClientBase {    
    (config: Config): RdbClient;
}
    