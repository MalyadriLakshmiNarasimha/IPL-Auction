import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// In-memory audio buffer cache (up to 200 most recent items)
const audioCache = new Map<string, Buffer>();
const MAX_CACHE_SIZE = 200;

function computeHash(text: string): string {
  return crypto.createHash('sha256').update(text.trim().toLowerCase()).digest('hex');
}

/**
 * Splits longer text into natural sentence or comma-separated chunks (< 180 chars)
 * to avoid URL length constraints while preserving natural presentation pauses.
 */
function splitTextIntoSpeechChunks(text: string): string[] {
  const cleaned = text
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length <= 160) {
    return [cleaned];
  }

  // Split on punctuation (. , ! ? ;)
  const rawParts = cleaned.split(/(?<=[.,!?;])\s+/);
  const chunks: string[] = [];
  let current = '';

  for (const part of rawParts) {
    if (!part) continue;
    if ((current + ' ' + part).trim().length <= 160) {
      current = (current + ' ' + part).trim();
    } else {
      if (current) chunks.push(current);
      // If a single part exceeds 160 chars, hard chunk by words
      if (part.length > 160) {
        const words = part.split(' ');
        let wordChunk = '';
        for (const w of words) {
          if ((wordChunk + ' ' + w).trim().length <= 160) {
            wordChunk = (wordChunk + ' ' + w).trim();
          } else {
            if (wordChunk) chunks.push(wordChunk);
            wordChunk = w;
          }
        }
        if (wordChunk) current = wordChunk;
      } else {
        current = part;
      }
    }
  }

  if (current) chunks.push(current);
  return chunks.length > 0 ? chunks : [cleaned.slice(0, 160)];
}

async function fetchAudioChunk(chunk: string): Promise<Buffer | null> {
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
    chunk
  )}&tl=en-IN&client=tw-ob`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Referer: 'https://translate.google.com/',
      },
      signal: AbortSignal.timeout(4000),
    });

    if (res.ok) {
      const arrayBuf = await res.arrayBuffer();
      return Buffer.from(arrayBuf);
    }
  } catch {
    // Network or timeout failure
  }
  return null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const text = searchParams.get('text');

  if (!text || text.trim().length === 0) {
    return NextResponse.json({ error: 'Text query parameter is required.' }, { status: 400 });
  }

  if (text.length > 600) {
    return NextResponse.json({ error: 'Text exceeds maximum limit of 600 characters.' }, { status: 400 });
  }

  const hash = computeHash(text);

  // Check cache
  if (audioCache.has(hash)) {
    const cachedBuffer = audioCache.get(hash)!;
    return new NextResponse(new Uint8Array(cachedBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    });
  }

  const chunks = splitTextIntoSpeechChunks(text);
  const audioBuffers: Buffer[] = [];

  for (const chunk of chunks) {
    const buf = await fetchAudioChunk(chunk);
    if (!buf) {
      return NextResponse.json(
        { error: 'Failed to synthesize central audio. Client will fallback to SpeechSynthesis.' },
        { status: 503 }
      );
    }
    audioBuffers.push(buf);
  }

  const combined = Buffer.concat(audioBuffers);

  // Store in cache with eviction
  if (audioCache.size >= MAX_CACHE_SIZE) {
    const firstKey = audioCache.keys().next().value;
    if (firstKey) audioCache.delete(firstKey);
  }
  audioCache.set(hash, combined);

  return new NextResponse(new Uint8Array(combined), {
    status: 200,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=86400, immutable',
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text = body?.text;
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Valid text string is required in request body.' }, { status: 400 });
    }

    const dummyUrl = new URL(req.url);
    dummyUrl.searchParams.set('text', text);
    return GET(new NextRequest(dummyUrl.toString(), { headers: req.headers }));
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
}

