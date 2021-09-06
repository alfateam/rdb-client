import {Filter} from './core';
import {RdbClient} from './client/customized';
export * from './core';

export interface RdbStatic {
    (baseUrl: string, options?: any): RdbClient;
    (db: object, options?: any): RdbClient;
    filter: Filter;
}      

declare const rdbClient: RdbStatic;
export default rdbClient;