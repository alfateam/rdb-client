import {Filter} from './core';
import {RdbClient, Config} from './client/customized';
export * from './client/customized';
export * from './core';


export interface RdbStatic {
    (config: Config): RdbClient;
    filter: Filter;
}      

declare function r(config: Config): RdbClient;

declare module r {
    var filter: Filter;
}

export = r;