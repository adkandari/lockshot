import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://itunes.apple.com/lookup?id=${id}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: 'iTunes API request failed' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('iTunes API proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch app data' },
      { status: 500 }
    );
  }
}
