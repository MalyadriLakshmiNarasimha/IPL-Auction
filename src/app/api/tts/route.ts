import { NextRequest, NextResponse } from 'next/server';
import { getTtsAvailability, synthesizeIndianFemaleVoice } from '@/lib/server-tts';
import { VoiceModulationStyle } from '@/shared/types';

function createFallbackResponse(reason: string = 'External TTS provider unavailable; use browser SpeechSynthesis fallback.') {
  return NextResponse.json(
    {
      available: false,
      fallbackToClient: true,
      mode: 'web_speech',
      rate: 1.1,
      voicePreference: 'en-IN-female',
      reason,
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'X-TTS-Fallback': 'web-speech',
      },
    }
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get('check') === '1') {
    const availability = getTtsAvailability();
    return NextResponse.json(
      {
        available: availability.fallbackMode === 'central_audio',
        fallbackToClient: availability.fallbackMode !== 'central_audio',
        mode: availability.fallbackMode,
        externalConfigured: availability.externalConfigured,
        rate: 1.1,
        voicePreference: 'en-IN-female',
      },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const text = searchParams.get('text');
  const rawStyle = searchParams.get('style');
  const nationality = searchParams.get('nationality') || undefined;
  const role = searchParams.get('role') || undefined;
  const style: VoiceModulationStyle =
    rawStyle === 'closing' ? 'closing' : rawStyle === 'sold' ? 'sold' : rawStyle === 'unsold' ? 'unsold' : 'intro';

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
    const context = (nationality || role) ? { nationality, role } : undefined;
    const result = await synthesizeIndianFemaleVoice(text, style, context);

    if (!result) {
      // Return HTTP 200 fallback directive so browser switches seamlessly to Web Speech API without DevTools 503 console errors
      return createFallbackResponse();
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
  } catch {
    return createFallbackResponse('Central TTS synthesis failed; automatically falling back to browser SpeechSynthesis.');
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
