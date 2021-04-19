export declare type GraphVersion = 'v1.0' | 'beta';
export interface GraphResponse<T = any> {
    data: T;
}
export declare const getGraph: <T>(endpoint: string, version?: GraphVersion) => Promise<GraphResponse<T>>;
