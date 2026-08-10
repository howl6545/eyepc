/**
 * Client HTTP "educato" per la raccolta dati.
 *
 * Regole che rispettiamo sempre:
 *  - robots.txt viene letto una volta per host e le regole per il nostro
 *    user-agent (o `*`) vengono applicate prima di ogni richiesta;
 *  - throttle per host, cosi' non generiamo mai burst di richieste;
 *  - timeout e retry con backoff esponenziale sui soli errori transitori.
 */

const USER_AGENT =
  'TechOffersHubBot/1.0 (+https://github.com/howl6545/eyepc; raccolta offerte PC a fini informativi)';

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_DELAY_MS = 1_500;
const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

const robotsCache = new Map();
const lastRequestAt = new Map();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function hostOf(url) {
  return new URL(url).host;
}

/** Parser minimale di robots.txt: raccoglie i Disallow applicabili a noi. */
export function parseRobots(body) {
  const groups = [];
  let current = null;

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;

    const separator = line.indexOf(':');
    if (separator === -1) continue;

    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();

    if (field === 'user-agent') {
      if (!current || current.rules.length) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
    } else if ((field === 'disallow' || field === 'allow') && current) {
      current.rules.push({ type: field, path: value });
    } else if (field === 'crawl-delay' && current) {
      const delay = Number.parseFloat(value);
      if (Number.isFinite(delay)) current.crawlDelayMs = delay * 1000;
    }
  }

  const ourAgent = 'techoffershubbot';
  const specific = groups.find((g) => g.agents.includes(ourAgent));
  const wildcard = groups.find((g) => g.agents.includes('*'));
  return specific ?? wildcard ?? { agents: ['*'], rules: [] };
}

/** Il match di robots.txt e' per prefisso, con `*` e `$` come jolly. */
function pathMatches(pattern, pathname) {
  if (pattern === '') return false;
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*');
  const anchored = escaped.endsWith('\\$') ? `^${escaped.slice(0, -2)}$` : `^${escaped}`;
  return new RegExp(anchored).test(pathname);
}

export function isAllowedByRobots(robots, url) {
  const { pathname, search } = new URL(url);
  const target = pathname + search;

  let decision = { allowed: true, length: -1 };
  for (const rule of robots.rules) {
    if (!pathMatches(rule.path, target)) continue;
    // Vince la regola con il prefisso piu' lungo (comportamento standard).
    if (rule.path.length > decision.length) {
      decision = { allowed: rule.type === 'allow', length: rule.path.length };
    }
  }
  return decision.allowed;
}

async function loadRobots(url) {
  const host = hostOf(url);
  if (robotsCache.has(host)) return robotsCache.get(host);

  const robotsUrl = `${new URL(url).origin}/robots.txt`;
  let robots = { agents: ['*'], rules: [] };
  try {
    const response = await fetch(robotsUrl, {
      headers: { 'user-agent': USER_AGENT },
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });
    if (response.ok) robots = parseRobots(await response.text());
  } catch {
    // Nessun robots.txt raggiungibile: si procede con le regole di default.
  }

  robotsCache.set(host, robots);
  return robots;
}

async function throttle(host, delayMs) {
  const previous = lastRequestAt.get(host) ?? 0;
  const wait = previous + delayMs - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequestAt.set(host, Date.now());
}

export class RobotsDisallowedError extends Error {
  constructor(url) {
    super(`robots.txt vieta la raccolta di ${url}`);
    this.name = 'RobotsDisallowedError';
    this.url = url;
  }
}

/**
 * Scarica una pagina rispettando robots.txt e il throttle per host.
 * @returns {Promise<string>} il corpo della risposta
 */
export async function fetchPage(url, options = {}) {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    delayMs = DEFAULT_DELAY_MS,
    retries = 3,
    headers = {},
    ignoreRobots = false,
  } = options;

  if (!ignoreRobots) {
    const robots = await loadRobots(url);
    if (!isAllowedByRobots(robots, url)) throw new RobotsDisallowedError(url);
    if (robots.crawlDelayMs) options.delayMs = Math.max(delayMs, robots.crawlDelayMs);
  }

  const host = hostOf(url);
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    await throttle(host, options.delayMs ?? delayMs);
    try {
      const response = await fetch(url, {
        headers: {
          'user-agent': USER_AGENT,
          'accept': 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
          'accept-language': 'it-IT,it;q=0.9',
          ...headers,
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (response.ok) return await response.text();

      if (!RETRYABLE_STATUS.has(response.status)) {
        throw new Error(`HTTP ${response.status} su ${url}`);
      }
      lastError = new Error(`HTTP ${response.status} su ${url}`);
    } catch (error) {
      lastError = error;
      if (error?.name === 'RobotsDisallowedError') throw error;
    }

    if (attempt < retries) await sleep(2 ** attempt * 1000);
  }

  throw lastError ?? new Error(`Richiesta fallita: ${url}`);
}

export { USER_AGENT };
