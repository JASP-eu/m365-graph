import axios from 'axios'

const instance = axios.create()

instance.defaults.headers.common['Accept'] =
  'application/json;odata.metadata=minimal;odata.streaming=true'
instance.defaults.headers.common['Prefer'] = 'HonorNonIndexedQueriesWarningMayFailRandomly'

export default instance

export const addAuthorizationToken = (accessToken: string) => {
  instance.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
}
