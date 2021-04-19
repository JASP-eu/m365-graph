import { GraphVersion } from './getGraph'
import { getGraphBatched, GraphBatchRequest, GraphBatchResponse } from './getGraphBatched'

export interface GraphListBatchResponse<T = any> {
  '@odata.context'?: string
  '@odata.count'?: number
  '@odata.nextLink'?: string
  value: T[]
}

export const getGraphListBatched = async <T>(
  requests: GraphBatchRequest[],
  version: GraphVersion = 'v1.0'
): Promise<GraphBatchResponse<GraphListBatchResponse<T>>[]> => {
  return await getGraphBatched<GraphListBatchResponse<T>>(requests, version)
}
