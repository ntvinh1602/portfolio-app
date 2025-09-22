import { NextRequest, NextResponse } from "next/server"
import fetch from "node-fetch"

interface VercelDeployment {
  uid: string
  name: string
  url: string
  createdAt: number
  state: string
  readyState: string
  [key: string]: unknown
}

interface VercelDeploymentResponse {
  deployments: VercelDeployment[]
}

const VERCEL_TOKEN = process.env.VERCEL_TOKEN!
const VERCEL_PROJECT = process.env.VERCEL_PROJECT
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID
  ? process.env.VERCEL_TEAM_ID
  : ""

export async function GET(req: NextRequest) {
  try {

    if (!VERCEL_PROJECT) {
      return NextResponse.json(
        { error: "Missing required query param: project" },
        { status: 400 }
      )
    }

    const url = `https://api.vercel.com/v6/deployments?app=${VERCEL_PROJECT}&${VERCEL_TEAM_ID}`

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
      },
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `Vercel API error: ${res.status} ${res.statusText}` },
        { status: res.status }
      )
    }

    const data = (await res.json() as VercelDeploymentResponse)
    return NextResponse.json({ deployments: data.deployments })
  } catch (err: any) {
    console.error("Failed to fetch deployments:", err)
    return NextResponse.json(
      { error: "Internal Server Error", details: err.message },
      { status: 500 }
    )
  }
}