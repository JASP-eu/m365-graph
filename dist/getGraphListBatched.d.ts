import { GraphVersion } from './getGraph';
import { GraphBatchRequest, GraphBatchResponse } from './getGraphBatched';
export interface GraphListBatchResponse<T = any> {
    '@odata.context'?: string;
    '@odata.count'?: number;
    '@odata.nextLink'?: string;
    value: T[];
}
export declare const getGraphListBatched: <T>(requests: GraphBatchRequest[], version?: GraphVersion) => Promise<GraphBatchResponse<GraphListBatchResponse<T>>[]>;
