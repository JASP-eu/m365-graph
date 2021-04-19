import { GraphVersion } from './getGraph';
export interface GraphListResponse<T = any> {
    data: {
        '@odata.context'?: string;
        '@odata.count'?: number;
        '@odata.nextLink'?: string;
        value: T[];
    };
}
export declare const getGraphList: <T>(endpoint: string, version?: GraphVersion) => Promise<GraphListResponse<T>>;
