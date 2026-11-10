/**
 * Indian Rupee (INR) Speech Formatter for IPL Auction Broadcast
 *
 * Formats monetary amounts into natural Indian English words:
 * Examples:
 *   ₹50,00,000    -> "Fifty lakh rupees"
 *   ₹1,00,00,000   -> "One crore rupees"
 *   ₹2,45,00,000   -> "Two crore forty-five lakh rupees"
 *   ₹2,50,00,000   -> "Two crore fifty lakh rupees"
 *   ₹14,50,00,000  -> "Fourteen crore fifty lakh rupees"
 *
 * Guaranteed:
 *   - Never produces floating-point speech (e.g. 2.500000000000)
 *   - Handles rounding and integer boundary conditions cleanly
 *   - Follows the Indian numbering system: Crore, Lakh, Thousand, Units
 */

const ONES: readonly string[] = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
  'thirteen',
  'fourteen',
  'fifteen',
  'sixteen',
  'seventeen',
  'eighteen',
  'nineteen',
];

const TENS: readonly string[] = [
  '',
  '',
  'twenty',
  'thirty',
  'forty',
  'fifty',
  'sixty',
  'seventy',
  'eighty',
  'ninety',
];

function numberToWordsUnder100(n: number): string {
  if (n < 20) return ONES[n];
  const tensPart = Math.floor(n / 10);
  const unitsPart = n % 10;
  return unitsPart === 0 ? TENS[tensPart] : `${TENS[tensPart]}-${ONES[unitsPart]}`;
}

function numberToWordsUnder1000(n: number): string {
  if (n < 100) return numberToWordsUnder100(n);
  const hundreds = Math.floor(n / 100);
  const remainder = n % 100;
  return remainder === 0
    ? `${ONES[hundreds]} hundred`
    : `${ONES[hundreds]} hundred ${numberToWordsUnder100(remainder)}`;
}

export interface InrSpeechOptions {
  capitalizeFirst?: boolean;
}

/**
 * Parses numeric value from either a number or common INR formatted strings:
 * e.g. "₹14.50 Cr", "₹50 L", "₹14,50,00,000", 145000000
 */
export function parseInrAmount(input: number | string): number {
  if (typeof input === 'number') {
    return isNaN(input) || !isFinite(input) ? 0 : Math.round(input);
  }

  const raw = String(input).trim();
  if (!raw) return 0;

  // Match Crore string: e.g. "₹ 14.5 Cr", "14.50 crore"
  const crMatch = raw.match(/₹?\s*([0-9.]+)\s*(?:Cr|Crore)/i);
  if (crMatch) {
    const val = parseFloat(crMatch[1]);
    return isNaN(val) ? 0 : Math.round(val * 1_00_00_000);
  }

  // Match Lakh string: e.g. "₹ 50 L", "50 lakh"
  const lMatch = raw.match(/₹?\s*([0-9.]+)\s*(?:L|Lakh)/i);
  if (lMatch) {
    const val = parseFloat(lMatch[1]);
    return isNaN(val) ? 0 : Math.round(val * 1_00_000);
  }

  // Raw digits with commas
  const cleaned = raw.replace(/[^\d.]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : Math.round(parsed);
}

/**
 * Formats any INR amount into natural Indian speech words.
 *
 * @param amount Number or string representing INR amount
 * @param options Optional configuration (e.g. capitalizeFirst)
 * @returns e.g. "Fourteen crore fifty lakh rupees"
 */
export function formatInrForSpeech(
  amount: number | string,
  options: InrSpeechOptions = { capitalizeFirst: true }
): string {
  const numericAmount = parseInrAmount(amount);

  if (numericAmount <= 0) {
    const zeroStr = 'zero rupees';
    return options.capitalizeFirst ? 'Zero rupees' : zeroStr;
  }

  // Indian Numbering Breakdown:
  // 1 Crore = 10,000,000
  // 1 Lakh  =    100,000
  // 1 Thousand =  1,000
  let remaining = numericAmount;

  const crores = Math.floor(remaining / 1_00_00_000);
  remaining %= 1_00_00_000;

  const lakhs = Math.floor(remaining / 1_00_000);
  remaining %= 1_00_000;

  const thousands = Math.floor(remaining / 1_000);
  remaining %= 1_000;

  const units = remaining;

  const parts: string[] = [];

  if (crores > 0) {
    parts.push(`${numberToWordsUnder1000(crores)} crore`);
  }
  if (lakhs > 0) {
    parts.push(`${numberToWordsUnder100(lakhs)} lakh`);
  }
  if (thousands > 0) {
    parts.push(`${numberToWordsUnder100(thousands)} thousand`);
  }
  if (units > 0) {
    parts.push(numberToWordsUnder1000(units));
  }

  const spoken = parts.length > 0 ? `${parts.join(' ')} rupees` : 'zero rupees';

  if (options.capitalizeFirst !== false) {
    return spoken.charAt(0).toUpperCase() + spoken.slice(1);
  }
  return spoken;
}
