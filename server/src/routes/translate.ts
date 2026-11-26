import { Router } from 'express';

interface TranslationResult {
  translation: string;
  alternatives: string[];
}

const cache = new Map<string, TranslationResult>();
const MAX_CACHE_ENTRIES = 500;

function setCache(key: string, value: TranslationResult) {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(key, value);
}

async function translateViaGoogle(text: string): Promise<TranslationResult | null> {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=es&dt=t&dt=bd&q=${encodeURIComponent(
    text
  )}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'EngBook/1.0' },
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as unknown[];

  const segments = Array.isArray(data[0]) ? (data[0] as unknown[][]) : [];
  const main = segments
    .map((seg) => (Array.isArray(seg) && typeof seg[0] === 'string' ? seg[0] : ''))
    .join('')
    .trim();

  const alts = new Set<string>();
  if (Array.isArray(data[1])) {
    for (const group of data[1] as unknown[][]) {
      if (Array.isArray(group) && Array.isArray(group[1])) {
        for (const item of group[1] as unknown[]) {
          if (typeof item === 'string' && item.trim() && item.toLowerCase() !== main.toLowerCase()) {
            alts.add(item.trim());
            if (alts.size >= 4) break;
          }
        }
      }
      if (alts.size >= 4) break;
    }
  }

  if (!main) return null;
  return { translation: main, alternatives: Array.from(alts) };
}

async function translateViaMyMemory(text: string): Promise<TranslationResult | null> {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
    text
  )}&langpair=en|es`;
  const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    responseData?: { translatedText?: string };
  };
  const main = data.responseData?.translatedText?.trim();
  if (!main) return null;
  return { translation: main, alternatives: [] };
}

export function createTranslateRouter(): Router {
  const router = Router();

  router.get('/', async (req, res) => {
    const raw = typeof req.query.text === 'string' ? req.query.text.trim() : '';
    if (!raw || raw.length > 120) {
      res.status(400).json({ error: 'Texto inválido para traducir' });
      return;
    }

    const cacheKey = raw.toLowerCase();
    const cached = cache.get(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    try {
      const result =
        (await translateViaGoogle(raw)) ?? (await translateViaMyMemory(raw));
      if (!result) {
        res.status(502).json({ error: 'No se pudo obtener la traducción' });
        return;
      }
      setCache(cacheKey, result);
      res.json(result);
    } catch {
      res.status(502).json({ error: 'Servicio de traducción temporalmente no disponible' });
    }
  });

  return router;
}
