interface RdbClient {
    beforeResponse(callback: (response: Response, options: ResponseOptions) =>  Promise<void> | void) : void;
    beforeRequest(callback: (request: RdbRequest) => Promise<RdbRequest> | RdbRequest | Promise<void> | void) : void;
    table<TTable>(path: string) : TTable;
    filter: Filter;
    or() : Filter;
    and() : Filter;
    not() : Filter;
    or() : Filter;
    reactive(proxyMethod: (obj: any) => any) : void;
}

interface ResponseOptions {
  retry(): void;
  attempts: number;
}

interface RdbRequest {
  method: string;
  headers: Headers;
  body: any;
}
export default RdbClient;