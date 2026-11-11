import { NextRequest, NextResponse } from 'next/server';
import { synthesizeIndianFemaleVoice } from '@/lib/server-tts';
import { VoiceModulationStyle } from '@/shared/types';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const text = searchParams.get('text');
  const rawStyle = searchParams.get('style');
  const style: VoiceModulationStyle =
    rawStyle === 'closing' ? 'closing' : rawStyle === 'sold' ? 'sold' : 'intro';

  if (!text || text.trim().length === 0) {
    return NextResponse.json({ error: 'Text query parameter is required.' }, { status: 400 });
  }

  if (text.length > 500) {
    return NextResponse.json(
      { error: 'Text exceeds maximum limit of 500 characters for announcement.' },
      { status: 400 }
    );
  }

  try {
    const result = await synthesizeIndianFemaleVoice(text, style);

    if (!result) {
      // Signals frontend client to fall back to browser SpeechSynthesis with Indian female voice
      return NextResponse.json(
        {
          error: 'Central voice synthesis unavailable. Fallback to client SpeechSynthesis.',
          fallbackToClient: true,
        },
        { status: 503 }
      );
    }

    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers: {
        'Content-Type': result.contentType,
        'Cache-Control': 'public, max-age=86400, immutable',
        'X-TTS-Provider': result.provider,
        'X-TTS-Voice': result.voice,
        'X-TTS-Cached': result.fromCache ? 'HIT' : 'MISS',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'TTS synthesis error',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text = body?.text;
    const style = body?.style;
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Valid text string is required in request body.' }, { status: 400 });
    }

    const dummyUrl = new URL(req.url);
    dummyUrl.searchParams.set('text', text);
    if (style) dummyUrl.searchParams.set('style', style);
    return GET(new NextRequest(dummyUrl.toString(), { headers: req.headers }));
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
}
