/**
 * Authoritative Server-Side Text-to-Speech Engine
 *
 * Evaluates and synthesizes natural Indian English Female Voice announcements:
 * 1. Microsoft Azure Speech Services Neural TTS (Voice: en-IN-NeerjaNeural / en-IN-KavyaNeural)
 * 2. ElevenLabs Text-to-Speech (Multilingual v2 with Indian English Female Voice)
 * 3. Google Cloud Text-to-Speech (Voice: en-IN-Neural2-A / en-IN-Wavenet-D)
 * 4. High-availability Fallback Engine
 *
 * Security:
 * - API keys and credentials reside strictly on the server (never exposed to client).
 * - Multi-tier caching prevents duplicate external API hits and eliminates lag.
 */

import crypto from 'crypto';
import { VoiceModulationStyle } from '../shared/types';

export type TtsProviderType = 'azure' | 'elevenlabs' | 'google' | 'fallback' | 'auto';

export interface PlayerTtsContext {
  nationality?: string;
  role?: string;
}

export interface TtsSynthesisResult {
  buffer: Buffer;
  contentType: string;
  provider: string;
  voice: string;
  fromCache: boolean;
}

// In-memory audio cache: Map<hash, { buffer: Buffer, contentType: string, provider: string, voice: string }>
interface CachedAudio {
  buffer: Buffer;
  contentType: string;
  provider: string;
  voice: string;
  createdAt: number;
}

const audioCache = new Map<string, CachedAudio>();
const MAX_CACHE_ENTRIES = 300;

function computeTtsHash(
  text: string,
  provider: string,
  voice: string,
  style: VoiceModulationStyle = 'intro',
  context?: PlayerTtsContext
): string {
  const contextKey = context ? `${context.nationality || ''}:${context.role || ''}` : '';
  return crypto
    .createHash('sha256')
    .update(`${provider}:${voice}:${style}:${contextKey}:${text.trim().toLowerCase()}`)
    .digest('hex');
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * 1. Microsoft Azure Neural TTS
 * Voice: en-IN-NeerjaNeural (Default Indian English female neural voice)
 * Distinct SSML modulation for Introduction vs Closing vs Sold vs Unsold
 * Subtly modulates intonation, emphasis and pacing based on nationality & role combinations.
 */
async function synthesizeWithAzure(
  text: string,
  style: VoiceModulationStyle = 'intro',
  context?: PlayerTtsContext
): Promise<Buffer | null> {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION || 'centralindia';
  const voice = process.env.AZURE_SPEECH_VOICE || 'en-IN-NeerjaNeural';

  if (!key) return null;

  const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;

  // Base modulation styles:
  // - 'closing': excited auctioneer style, higher pitch (+10%), punchy rate (+12%)
  // - 'sold' / 'unsold': authoritative, suspenseful confirmation (+10% rate, +6% pitch, strong emphasis)
  // - 'intro': professional calm informative broadcast (+10% rate, 0% pitch)
  let prosodyRate = style === 'closing' ? '+12%' : '+10%';
  let prosodyPitch = style === 'closing' ? '+10%' : (style === 'sold' || style === 'unsold') ? '+6%' : '0%';

  // Dynamic nationality + role modulation variations:
  if (style === 'intro' && context) {
    const role = (context.role || '').toLowerCase();
    const isOverseas = context.nationality && context.nationality !== 'India';
    if (role.includes('fast') || (role.includes('bowl') && !role.includes('spin'))) {
      // Fast bowler: punchy energetic pacing
      prosodyRate = '+11%';
      prosodyPitch = '+2%';
    } else if (role.includes('spin')) {
      // Spin bowler: articulate, measured pacing
      prosodyRate = '+9%';
      prosodyPitch = '+1%';
    } else if (role.includes('all-rounder') || role.includes('all rounder')) {
      // All-rounder: balanced dynamic cadence
      prosodyRate = '+10%';
      prosodyPitch = '+2%';
    } else if (role.includes('wicket')) {
      // Wicketkeeper: sharp, alert delivery
      prosodyRate = '+11%';
      prosodyPitch = '+1%';
    }

    if (isOverseas) {
      // Subtle intonation lift for international marquee profiles
      prosodyPitch = `${parseInt(prosodyPitch, 10) + 1}%`;
    }
  }

  const content = (style === 'closing' || style === 'unsold')
    ? `<emphasis level='strong'>${escapeXml(text)}</emphasis>`
    : escapeXml(text);

  const ssml = `
    <speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xmlns:mstts='https://www.w3.org/2001/mstts' xml:lang='en-IN'>
      <voice name='${voice}'>
        <prosody rate='${prosodyRate}' pitch='${prosodyPitch}'>
          ${content}
        </prosody>
      </voice>
    </speak>
  `.trim();

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
        'User-Agent': 'IPLAuction/2.0',
      },
      body: ssml,
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const arrayBuffer = await res.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }
  } catch (err) {
    console.warn('[TTS] Azure Neural TTS call failed:', err);
  }
  return null;
}

/**
 * 2. ElevenLabs Text-to-Speech
 * High-expressiveness Indian female voice
 * Configures stability & style parameters to deliver energetic auctioneer cadence
 */
async function synthesizeWithElevenLabs(text: string, style: VoiceModulationStyle = 'intro'): Promise<Buffer | null> {
  const key = process.env.ELEVENLABS_API_KEY;
  // Default natural Indian female voice ID or configured voice ID
  const voiceId = process.env.ELEVENLABS_VOICE_ID || 'XB0fDUnXU5powFXDhCwa';

  if (!key) return null;

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

  // Voice modulation parameters:
  // - 'closing': lower stability (0.40) & higher style (0.60) for suspenseful, energetic auctioneer cadence
  // - 'sold' / 'unsold': authoritative, suspenseful delivery (0.50 stability, 0.45 style)
  // - 'intro': calm, confident, professional stability (0.75 stability, 0.15 style)
  const voiceSettings =
    style === 'closing'
      ? { stability: 0.40, similarity_boost: 0.80, style: 0.60, use_speaker_boost: true }
      : style === 'sold' || style === 'unsold'
      ? { stability: 0.50, similarity_boost: 0.80, style: 0.45, use_speaker_boost: true }
      : { stability: 0.75, similarity_boost: 0.85, style: 0.15, use_speaker_boost: true };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'xi-api-key': key,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: voiceSettings,
      }),
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      const arrayBuffer = await res.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }
  } catch (err) {
    console.warn('[TTS] ElevenLabs call failed:', err);
  }
  return null;
}

/**
 * 3. Google Cloud Text-to-Speech
 * Voice: en-IN-Neural2-A (Female)
 */
async function synthesizeWithGoogleCloud(text: string, style: VoiceModulationStyle = 'intro'): Promise<Buffer | null> {
  const key = process.env.GOOGLE_TTS_API_KEY;
  const voice = process.env.GOOGLE_TTS_VOICE || 'en-IN-Neural2-A';

  if (!key) return null;

  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${key}`;

  const speakingRate = style === 'closing' ? 1.12 : 1.10;
  const pitch = style === 'closing' ? 2.5 : (style === 'sold' || style === 'unsold') ? 1.5 : 0.0;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: { text },
        voice: {
          languageCode: 'en-IN',
          name: voice,
          ssmlGender: 'FEMALE',
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate,
          pitch,
        },
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const data = (await res.json()) as { audioContent?: string };
      if (data.audioContent) {
        return Buffer.from(data.audioContent, 'base64');
      }
    }
  } catch (err) {
    console.warn('[TTS] Google Cloud TTS call failed:', err);
  }
  return null;
}

/**
 * 4. High-Availability Fallback Synthesizer
 */
async function synthesizeWithFallback(text: string): Promise<Buffer | null> {
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
    text.slice(0, 200)
  )}&tl=en-IN&client=tw-ob`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        Referer: 'https://translate.google.com/',
      },
      signal: AbortSignal.timeout(4000),
    });

    if (res.ok) {
      const arrayBuffer = await res.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }
  } catch {
    // Network or rate limit failure
  }
  return null;
}

/**
 * Determines configured provider
 */
export function getConfiguredProvider(): TtsProviderType {
  const configured = (process.env.TTS_PROVIDER || 'auto').toLowerCase() as TtsProviderType;
  if (['azure', 'elevenlabs', 'google', 'fallback', 'auto'].includes(configured)) {
    return configured;
  }
  return 'auto';
}

/**
 * Synthesizes text into high-fidelity Indian female broadcast speech.
 * Automatically respects cache and provides fallback if external API is unreachable.
 */
export async function synthesizeIndianFemaleVoice(
  text: string,
  style: VoiceModulationStyle = 'intro',
  context?: PlayerTtsContext
): Promise<TtsSynthesisResult | null> {
  const cleanText = text.trim();
  if (!cleanText) return null;

  const configuredProvider = getConfiguredProvider();

  // Determine active provider order
  const providersToAttempt: Array<{
    name: string;
    synthesize: (t: string, s?: VoiceModulationStyle, c?: PlayerTtsContext) => Promise<Buffer | null>;
    voice: string;
  }> = [];

  if (configuredProvider === 'azure' || (configuredProvider === 'auto' && process.env.AZURE_SPEECH_KEY)) {
    providersToAttempt.push({
      name: 'azure',
      synthesize: (t, s, c) => synthesizeWithAzure(t, s, c),
      voice: process.env.AZURE_SPEECH_VOICE || 'en-IN-NeerjaNeural',
    });
  }

  if (
    configuredProvider === 'elevenlabs' ||
    (configuredProvider === 'auto' && process.env.ELEVENLABS_API_KEY)
  ) {
    providersToAttempt.push({
      name: 'elevenlabs',
      synthesize: (t, s) => synthesizeWithElevenLabs(t, s),
      voice: process.env.ELEVENLABS_VOICE_ID || 'XB0fDUnXU5powFXDhCwa',
    });
  }

  if (
    configuredProvider === 'google' ||
    (configuredProvider === 'auto' && process.env.GOOGLE_TTS_API_KEY)
  ) {
    providersToAttempt.push({
      name: 'google',
      synthesize: (t, s) => synthesizeWithGoogleCloud(t, s),
      voice: process.env.GOOGLE_TTS_VOICE || 'en-IN-Neural2-A',
    });
  }

  // Always include fallback as safety net
  providersToAttempt.push({
    name: 'fallback',
    synthesize: (t) => synthesizeWithFallback(t),
    voice: 'en-IN-NeuralFallback',
  });

  // Check cache against the top preferred provider, style and context
  const primary = providersToAttempt[0];
  const cacheKey = computeTtsHash(cleanText, primary.name, primary.voice, style, context);

  if (audioCache.has(cacheKey)) {
    const cached = audioCache.get(cacheKey)!;
    return {
      buffer: cached.buffer,
      contentType: cached.contentType,
      provider: cached.provider,
      voice: cached.voice,
      fromCache: true,
    };
  }

  // Execute synthesis attempt
  for (const p of providersToAttempt) {
    const buf = await p.synthesize(cleanText, style, context);
    if (buf && buf.length > 0) {
      const result: CachedAudio = {
        buffer: buf,
        contentType: 'audio/mpeg',
        provider: p.name,
        voice: p.voice,
        createdAt: Date.now(),
      };

      // LRU cache eviction
      if (audioCache.size >= MAX_CACHE_ENTRIES) {
        const oldestKey = audioCache.keys().next().value;
        if (oldestKey) audioCache.delete(oldestKey);
      }
      audioCache.set(cacheKey, result);

      return {
        buffer: buf,
        contentType: 'audio/mpeg',
        provider: p.name,
        voice: p.voice,
        fromCache: false,
      };
    }
  }

  return null;
}

