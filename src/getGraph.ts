import axios from './axios'

export type GraphVersion = 'v1.0' | 'beta'

export interface GraphResponse<T = any> {
  data: T
}

export const getGraph = async <T>(
  endpoint: string,
  version: GraphVersion = 'v1.0'
): Promise<GraphResponse<T>> => {
  let error: any

  // if request fails, try it 10 times before throwing the error
  for (let leftAttempts = 10; leftAttempts > 0; leftAttempts--) {
    try {
      if (endpoint.startsWith('https://')) {
        return await axios.get<T>(`${endpoint}`)
      } else {
        return await axios.get<T>(`https://graph.microsoft.com/${version}${endpoint}`)
      }
    } catch (e) {
      error = e

      // 429 means we're getting throttled
      if (e.response?.status === 429) {
        // try to get retry-after value from response
        const headers = e.response.headers
        if (headers) {
          const retryAfter = parseInt(headers['Retry-After'] ?? '', 10)
          // check is not NaN (NaN is never equal to itself)
          // eslint-disable-next-line no-self-compare
          if (retryAfter === retryAfter) {
            console.warn(`We are getting throttled. Retrying in ${retryAfter} seconds.`)
            await new Promise(resolve => setTimeout(resolve, retryAfter * 1000))
            continue
          }
        }
      } else if (e.response?.status >= 500 || e.response?.status === 401) {
        // just retry until all attempts are done
        if (leftAttempts <= 3) {
          // sleep for 1s
          await new Promise(resolve => setTimeout(resolve, 1000))
        } else if (leftAttempts <= 6) {
          // sleep for 500ms
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      } else {
        throw new Error(JSON.stringify(e.response))
      }
    }
  }

  throw new Error('Request failed (ran out of retries): ' + error)
}
