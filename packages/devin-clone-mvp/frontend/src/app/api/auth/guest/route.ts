import { NextResponse } from 'next/server';

export async function POST() {
  try {
    console.log('🚀 Guest login API route called');
    
    // Check if backend is available
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    console.log('🔗 Backend URL:', backendUrl);
    
    // Call the backend guest login endpoint
    const response = await fetch(`${backendUrl}/api/v1/auth/guest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('📊 Backend response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Backend error:', errorText);
      return NextResponse.json(
        { error: `Backend error: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Backend response data:', data);
    
    return NextResponse.json({
      success: true,
      email: data.email,
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });
    
  } catch (error) {
    console.error('💥 Guest login API error:', error);
    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
