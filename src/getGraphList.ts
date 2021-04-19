import { getGraph, GraphVersion } from './getGraph'

export interface GraphListResponse<T = any> {
  data: {
    '@odata.context'?: string
    '@odata.count'?: number
    '@odata.nextLink'?: string
    value: T[]
  }
}

export const getGraphList = async <T>(
  endpoint: string,
  version: GraphVersion = 'v1.0'
): Promise<GraphListResponse<T>> => {
  // add type information for the response
  return getGraph<{
    '@odata.context'?: string
    '@odata.count'?: number
    '@odata.nextLink'?: string
    value: T[]
  }>(endpoint, version)
}
