import { getBrokerToken, refreshBrokerToken } from "./auth"

const BASE_URL = "https://api.dnse.com.vn"

export async function brokerFetch(
  path: string,
  options: RequestInit = {}
) {
  let token = await getBrokerToken()

  const makeRequest = async (jwt: string) => {
    return fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
        ...(options.headers || {}),
      },
    })
  }

  let res = await makeRequest(token)

  if (res.status === 401) {
    token = await refreshBrokerToken()
    res = await makeRequest(token)
  }

  if (!res.ok) {
    throw new Error(`Broker request failed: ${res.status}`)
  }

  return res.json()
}