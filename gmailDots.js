const GMAIL_DOMAINS = new Set(['gmail.com', 'googlemail.com']);
const DEFAULT_MAX_VARIANTS = 65536;
const DEFAULT_MODE = 'wordSplit';
const MIN_WORD_SPLIT_SCORE = 15;

const COMMON_FIRST_NAMES = new Set([
  'alex', 'andrew', 'anna', 'ben', 'chris', 'daniel', 'david', 'emma',
  'ethan', 'james', 'jane', 'john', 'josh', 'katie', 'mark', 'mary',
  'matt', 'michael', 'micah', 'olivia', 'ryan', 'sam', 'sarah', 'william'
]);

const COMMON_LAST_NAMES = new Set([
  'adams', 'anderson', 'berkley', 'brown', 'clark', 'davis', 'doe', 'evans',
  'garcia', 'harris', 'johnson', 'jones', 'lee', 'martin', 'miller', 'moore',
  'roberts', 'smith', 'taylor', 'thomas', 'walker', 'williams', 'wilson'
]);

export function parseGmailAddress(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  const atIndex = trimmed.indexOf('@');

  if (atIndex <= 0 || atIndex !== trimmed.lastIndexOf('@')) {
    return null;
  }

  const localRaw = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1).toLowerCase();

  if (!GMAIL_DOMAINS.has(domain)) {
    return null;
  }

  const plusIndex = localRaw.indexOf('+');
  const localBeforePlus = plusIndex === -1 ? localRaw : localRaw.slice(0, plusIndex);
  const plusTag = plusIndex === -1 ? '' : localRaw.slice(plusIndex).toLowerCase();

  // Gmail local part only permits letters, numbers, and dots.
  if (!/^[a-z0-9.]+$/i.test(localBeforePlus)) {
    return null;
  }

  if (plusTag && !/^\+[a-z0-9._-]+$/i.test(plusTag)) {
    return null;
  }

  // Dots are ignored by Gmail; normalize to base characters first.
  const casedLocal = localBeforePlus.replace(/\./g, '');
  const baseLocal = localBeforePlus.toLowerCase().replace(/\./g, '');

  if (!baseLocal) {
    return null;
  }

  return {
    baseLocal,
    casedLocal,
    plusTag,
    domain
  };
}

function generateAllVariants(parsed) {
  const { baseLocal, plusTag, domain } = parsed;
  const splitPoints = Math.max(baseLocal.length - 1, 0);
  const variantsCount = 2 ** splitPoints;

  if (variantsCount > DEFAULT_MAX_VARIANTS) {
    throw new RangeError(
      `Generated permutations exceed maxVariants (${DEFAULT_MAX_VARIANTS}).`
    );
  }

  const variants = [];

  for (let mask = 0; mask < variantsCount; mask += 1) {
    let local = baseLocal[0];

    for (let i = 0; i < splitPoints; i += 1) {
      if ((mask & (1 << i)) !== 0) {
        local += '.';
      }
      local += baseLocal[i + 1];
    }

    variants.push(`${local}${plusTag}@${domain}`);
  }

  return variants;
}

function isLowerCaseLetter(char) {
  return char >= 'a' && char <= 'z';
}

function isUpperCaseLetter(char) {
  return char >= 'A' && char <= 'Z';
}

function chooseWordSplitIndex(casedLocal) {
  if (casedLocal.length < 2) {
    return null;
  }

  const lowerLocal = casedLocal.toLowerCase();
  let bestIndex = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (let i = 1; i < casedLocal.length; i += 1) {
    const leftRaw = casedLocal.slice(0, i);
    const rightRaw = casedLocal.slice(i);
    const left = lowerLocal.slice(0, i);
    const right = lowerLocal.slice(i);

    let score = 0;

    if (isLowerCaseLetter(leftRaw[leftRaw.length - 1]) && isUpperCaseLetter(rightRaw[0])) {
      score += 50;
    }

    if (COMMON_FIRST_NAMES.has(left)) {
      score += 12;
    }

    if (COMMON_LAST_NAMES.has(right)) {
      score += 12;
    }

    if (COMMON_FIRST_NAMES.has(left) && COMMON_LAST_NAMES.has(right)) {
      score += 16;
    }

    if (left.length >= 3 && right.length >= 3) {
      score += 4;
    }

    if (left.length < 2 || right.length < 2) {
      score -= 20;
    }

    score -= Math.abs(left.length - right.length) * 0.8;

    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  if (bestScore < MIN_WORD_SPLIT_SCORE) {
    return null;
  }

  return bestIndex;
}

function generateWordSplitVariants(parsed) {
  const { baseLocal, casedLocal, plusTag, domain } = parsed;
  const splitIndex = chooseWordSplitIndex(casedLocal);

  if (!splitIndex || splitIndex <= 0 || splitIndex >= baseLocal.length) {
    return [`${baseLocal}${plusTag}@${domain}`];
  }

  const local = `${baseLocal.slice(0, splitIndex)}.${baseLocal.slice(splitIndex)}`;
  return [`${local}${plusTag}@${domain}`];
}

export function generateGmailDotVariants(value, options = {}) {
  const parsed = parseGmailAddress(value);

  if (!parsed) {
    return [];
  }

  const mode = options.mode ?? DEFAULT_MODE;

  if (mode === 'all') {
    return generateAllVariants(parsed);
  }

  if (mode === 'wordSplit') {
    return generateWordSplitVariants(parsed);
  }

  throw new TypeError(`Unsupported mode "${mode}". Use "wordSplit" or "all".`);
}
