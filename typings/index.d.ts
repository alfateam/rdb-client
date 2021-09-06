import {Filter} from './core';
import {RdbClient, Config} from './client/customized';
export * from './client/customized';
export * from './core';


export interface RdbStatic {
    (config: Config): RdbClient;
    filter: Filter;
}      

declare const rdbClient: RdbStatic;
export default rdbClient;