import { GraphVersion } from './getGraph';
export interface GraphBatchRequest {
    id: string;
    method: string;
    url: string;
    headers?: {
        'Content-Type': string;
    };
}
export interface GraphBatchResponse<T = any> {
    id: string;
    body: T;
    headers?: {
        'Retry-After': string;
    };
    status: number;
}
export declare const getGraphBatched: <T = any>(requests: GraphBatchRequest[], version?: GraphVersion, leftAttempts?: number, retryAfter?: number) => Promise<GraphBatchResponse<T>[]>;
