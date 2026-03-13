let token: string | null = null
let expiry = 0

// shared promise to prevent concurrent logins
let loginPromise: Promise<string> | null = null

async function loginBroker(): Promise<string> {
  const res = await fetch("https://api.dnse.com.vn/auth-service/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username: process.env.DNSE_USERNAME,
      password: process.env.DNSE_PASSWORD,
    }),
  })

  if (!res.ok) {
    throw new Error("DNSE login failed")
  }

  const data = await res.json()

  const newToken: string = data.token

  token = newToken

  // refresh slightly early (7h50m)
  expiry = Date.now() + 7.8 * 60 * 60 * 1000

  return newToken
}

export async function getBrokerToken(): Promise<string> {
  if (token && Date.now() < expiry) {
    return token
  }

  // if login already running, wait for it
  if (!loginPromise) {
    loginPromise = loginBroker().finally(() => {
      loginPromise = null
    })
  }

  return loginPromise
}

export async function refreshBrokerToken(): Promise<string> {
  loginPromise = loginBroker().finally(() => {
    loginPromise = null
  })

  return loginPromise
}