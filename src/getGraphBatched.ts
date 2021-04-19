import axios from './axios'
import { GraphVersion } from './getGraph'

export interface GraphBatchRequest {
  id: string
  method: string
  url: string
  headers?: {
    'Content-Type': string
  }
}

export interface GraphBatchResponse<T = any> {
  id: string
  body: T
  headers?: {
    'Retry-After': string
  }
  status: number
}

export const getGraphBatched = async <T = any>(
  requests: GraphBatchRequest[],
  version: GraphVersion = 'v1.0',
  leftAttempts: number = 20,
  retryAfter: number = 0
): Promise<GraphBatchResponse<T>[]> => {
  const requestChunks = []

  if (retryAfter) {
    // sleep for retryAfter seconds
    console.warn(`We are getting throttled. Retrying in ${retryAfter} seconds.`)
    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000))
  } else if (leftAttempts <= 7) {
    // sleep for 1s
    await new Promise(resolve => setTimeout(resolve, 1000))
  } else if (leftAttempts <= 13) {
    // sleep for 500ms
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  // strip https... prefix from requests
  requests = requests.map(request => {
    if (request.url.includes('https://graph.microsoft.com')) {
      return { ...request, url: request.url.slice(32) }
    }
    return request
  })

  // create chunks of 20 requests per batch. that's the maximum Microsoft can handle
  for (let i = 0; i < requests.length; i += 20) {
    requestChunks.push(requests.slice(i, i + 20))
  }

  // send all batch chunks in parallel
  // if the whole batch failed, return all requests as if they would've gotten 500s each
  const responseChunks: { data: { responses: GraphBatchResponse<T>[] } }[] = await Promise.all(
    requestChunks.map(requests =>
      axios.post(`https://graph.microsoft.com/${version}/$batch`, { requests }).catch(() => ({
        data: {
          responses: requests.map(
            request =>
              ({
                id: request.id,
                status: 500,
                body: {},
                headers: undefined,
              } as GraphBatchResponse<T>)
          ),
        },
      }))
    )
  )

  interface RequestReducer {
    succeeded: GraphBatchResponse<T>[]
    toBeRetried: GraphBatchResponse<T>[]
    retryAfter: number
  }

  // reduce all chunk responses into all succeeded and all failed
  const reduceResult = responseChunks.reduce(
    ({ succeeded, toBeRetried, retryAfter }: RequestReducer, chunk) => {
      let newRetryAfter = retryAfter

      // consider everything failed that's over 400
      const succeededResponses = chunk.data.responses.filter(x => x.status < 400)

      // retry 500 and 401 because those fail randomly
      // retry 429 because those are being throttled
      const toBeRetriedResponses = chunk.data.responses.filter(
        x => x.status >= 500 || x.status === 401 || x.status === 429
      )

      // try to get retry-after value from response
      const throttledRequestHeaders = toBeRetriedResponses.find(x => x.status === 429)?.headers
      if (throttledRequestHeaders) {
        const parsedRetryAfter = parseInt(throttledRequestHeaders['Retry-After'] ?? '', 10)
        // check is not NaN (NaN is never equal to itself)
        // eslint-disable-next-line no-self-compare
        if (parsedRetryAfter === parsedRetryAfter && parsedRetryAfter > newRetryAfter) {
          newRetryAfter = parsedRetryAfter
        }
      }

      return {
        succeeded: succeeded.concat(succeededResponses),
        toBeRetried: toBeRetried.concat(toBeRetriedResponses),
        retryAfter: newRetryAfter,
      }
    },
    { succeeded: [], toBeRetried: [], retryAfter }
  )

  const succeededRequests = reduceResult.succeeded
  const toBeRetriedRequests = reduceResult.toBeRetried
  retryAfter = reduceResult.retryAfter

  // some requests failed? retry those if retries are left
  if (toBeRetriedRequests.length) {
    console.warn(
      `${toBeRetriedRequests.length} batch requests failed; left retries: ${leftAttempts}`
    )

    if (leftAttempts > 0) {
      const retryResponses = await getGraphBatched<T>(
        requests.filter(x => toBeRetriedRequests.find(f => f.id === x.id)),
        version,
        leftAttempts - 1,
        retryAfter
      )

      return succeededRequests.concat(retryResponses)
    }

    throw new Error('Batch request failed. Went out of retries.')
  }

  // no failed? then just return the succeeded ones
  return succeededRequests
}
