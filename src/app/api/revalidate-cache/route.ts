import { revalidateTag } from 'next/cache'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { action, userId } = await request.json()

  if (action === 'SIGNED_OUT' && userId) {
    // Invalidate old user's cache
    revalidateTag(`performance-${userId}`)
    revalidateTag(`asset-data-${userId}`)
  }

  return NextResponse.json({ revalidated: true })
}