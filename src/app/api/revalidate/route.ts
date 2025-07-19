import { revalidatePath, revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const secret = request.headers.get('Authorization')?.split(' ')[1];
  const REVALIDATE_TOKEN = process.env.REVALIDATE_TOKEN;

  if (!secret || secret !== REVALIDATE_TOKEN) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const body = await request.json();
  const { tag, path } = body;

  if (tag) {
    revalidateTag(tag);
  }

  if (path) {
    revalidatePath(path);
  }

  return NextResponse.json({ revalidated: true, tag, path, now: Date.now() });
}