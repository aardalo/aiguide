import type { RouteChunk } from './types';
import type { BoundsArea } from './prompt';

interface SearxngResult {
  title: string;
  url: string;
  content: string; // snippet
}

interface SearxngResponse {
  results: SearxngResult[];
}

// ---------------------------------------------------------------------------
// Search categories — used to group results in the formatted output
// ---------------------------------------------------------------------------

type SearchCategory = 'highlights' | 'hidden_gems' | 'heritage' | 'nature' | 'culinary';

const CATEGORY_LABELS: Record<SearchCategory, string> = {
  highlights: 'Top Experiences & Attractions',
  hidden_gems: 'Hidden Gems & Off the Beaten Path',
  heritage: 'Heritage, Museums & Architecture',
  nature: 'Nature, Scenic Views & Hikes',
  culinary: 'Culinary & Wine',
};

const CATEGORIES: SearchCategory[] = ['highlights', 'hidden_gems', 'heritage', 'nature', 'culinary'];

// ---------------------------------------------------------------------------
// Query context — extracted from route chunk or bounds
// ---------------------------------------------------------------------------

interface QueryContext {
  cities: string[];
  regions: string[];
  countries: string[];
}

function extractContext(chunk: RouteChunk): QueryContext {
  const cities = new Set<string>();
  const regions = new Set<string>();
  const countries = new Set<string>();

  for (const dest of chunk.destinations) {
    const parts = dest.name.split(',').map((p) => p.trim());
    if (parts.length > 0) cities.add(parts[0]);
    if (parts.length > 2) regions.add(parts[parts.length - 2]);
    if (parts.length > 1) countries.add(parts[parts.length - 1]);
  }

  return {
    cities: [...cities],
    regions: [...regions],
    countries: [...countries],
  };
}

// ---------------------------------------------------------------------------
// English query templates — natural travel search phrases
// ---------------------------------------------------------------------------

interface QueryTemplate {
  category: SearchCategory;
  build: (ctx: QueryContext) => string;
}

const ENGLISH_QUERIES: QueryTemplate[] = [
  // Broad travel discovery
  {
    category: 'highlights',
    build: (ctx) =>
      `best things to do in ${ctx.cities.slice(0, 3).join(' ')} ${ctx.countries[0] ?? ''}`,
  },
  {
    category: 'highlights',
    build: (ctx) =>
      ctx.cities.length >= 2
        ? `"must see" OR "top attractions" between ${ctx.cities[0]} and ${ctx.cities[ctx.cities.length - 1]}`
        : `"must see" OR "top attractions" ${ctx.regions[0] ?? ctx.countries[0] ?? ''}`,
  },
  // Hidden gems & underrated
  {
    category: 'hidden_gems',
    build: (ctx) =>
      `"hidden gems" OR "off the beaten path" OR "underrated" ${ctx.regions.slice(0, 2).join(' ') || ctx.countries.join(' ')}`,
  },
  // Heritage & culture
  {
    category: 'heritage',
    build: (ctx) =>
      `"UNESCO sites" OR "heritage sites" OR "historic landmarks" ${ctx.countries.join(' ')}`,
  },
  {
    category: 'heritage',
    build: (ctx) =>
      `castles OR museums OR cathedrals OR "iconic landmarks" ${ctx.cities.slice(0, 2).join(' ')} ${ctx.countries[0] ?? ''}`,
  },
  // Nature & scenic
  {
    category: 'nature',
    build: (ctx) =>
      `"national parks" OR "natural wonders" OR "scenic viewpoints" OR "best hikes" ${ctx.countries.join(' ')}`,
  },
  // Culinary
  {
    category: 'culinary',
    build: (ctx) =>
      `"Michelin" OR "best restaurants" OR "food experiences" ${ctx.cities.slice(0, 2).join(' ')} ${ctx.countries[0] ?? ''}`,
  },
  {
    category: 'culinary',
    build: (ctx) =>
      `"wine region" OR "culinary experiences" OR "street food" ${ctx.regions[0] ?? ctx.countries[0] ?? ''}`,
  },
];

// ---------------------------------------------------------------------------
// Local-language query templates per country
// Uses natural search phrases locals and travel bloggers actually use.
// ---------------------------------------------------------------------------

interface CountryTerms {
  lang: string;
  highlights: string;
  hidden_gems: string;
  heritage: string;
  nature: string;
  culinary: string;
}

const COUNTRY_SEARCH_TERMS: Record<string, CountryTerms> = {
  France: {
    lang: 'fr',
    highlights: '"que faire à" OR "incontournables"',
    hidden_gems: '"lieux secrets" OR "pépites méconnues"',
    heritage: '"sites UNESCO" OR "monuments historiques"',
    nature: '"parcs nationaux" OR "randonnées" OR "points de vue"',
    culinary: '"meilleurs restaurants" OR "étoile Michelin" OR "gastronomie"',
  },
  Italy: {
    lang: 'it',
    highlights: '"cosa vedere a" OR "da non perdere"',
    hidden_gems: '"posti nascosti" OR "gemme nascoste"',
    heritage: '"siti UNESCO" OR "monumenti storici"',
    nature: '"parchi nazionali" OR "sentieri" OR "punti panoramici"',
    culinary: '"migliori ristoranti" OR "stella Michelin" OR "enogastronomia"',
  },
  Spain: {
    lang: 'es',
    highlights: '"qué ver en" OR "imprescindibles"',
    hidden_gems: '"lugares secretos" OR "joyas escondidas"',
    heritage: '"sitios UNESCO" OR "monumentos históricos"',
    nature: '"parques nacionales" OR "rutas de senderismo" OR "miradores"',
    culinary: '"mejores restaurantes" OR "estrella Michelin" OR "gastronomía"',
  },
  Germany: {
    lang: 'de',
    highlights: '"Sehenswürdigkeiten" OR "was tun in"',
    hidden_gems: '"Geheimtipps" OR "versteckte Orte"',
    heritage: '"UNESCO-Welterbe" OR "historische Denkmäler"',
    nature: '"Nationalparks" OR "Wanderwege" OR "Aussichtspunkte"',
    culinary: '"beste Restaurants" OR "Michelin-Stern" OR "kulinarische Erlebnisse"',
  },
  Portugal: {
    lang: 'pt',
    highlights: '"o que fazer em" OR "imperdíveis"',
    hidden_gems: '"lugares secretos" OR "joias escondidas"',
    heritage: '"sítios UNESCO" OR "monumentos históricos"',
    nature: '"parques nacionais" OR "trilhos" OR "miradouros"',
    culinary: '"melhores restaurantes" OR "estrela Michelin"',
  },
  Netherlands: {
    lang: 'nl',
    highlights: '"wat te doen in" OR "bezienswaardigheden"',
    hidden_gems: '"verborgen parels" OR "onontdekte plekken"',
    heritage: '"UNESCO-werelderfgoed" OR "historische monumenten"',
    nature: '"nationale parken" OR "wandelroutes" OR "uitzichtpunten"',
    culinary: '"beste restaurants" OR "Michelin-ster"',
  },
  Norway: {
    lang: 'no',
    highlights: '"hva gjøre i" OR "severdigheter"',
    hidden_gems: '"skjulte perler" OR "ukjente steder"',
    heritage: '"UNESCO verdensarv" OR "historiske monumenter"',
    nature: '"nasjonalparker" OR "turløyper" OR "utsiktspunkter"',
    culinary: '"beste restauranter" OR "Michelin-stjerne"',
  },
  Sweden: {
    lang: 'sv',
    highlights: '"vad göra i" OR "sevärdheter"',
    hidden_gems: '"gömda pärlor" OR "okända platser"',
    heritage: '"UNESCO världsarv" OR "historiska monument"',
    nature: '"nationalparker" OR "vandringsleder" OR "utsiktsplatser"',
    culinary: '"bästa restauranger" OR "Michelin-stjärna"',
  },
  Denmark: {
    lang: 'da',
    highlights: '"hvad lave i" OR "seværdigheder"',
    hidden_gems: '"skjulte perler" OR "ukendte steder"',
    heritage: '"UNESCO verdensarv" OR "historiske monumenter"',
    nature: '"nationalparker" OR "vandreruter" OR "udsigtspunkter"',
    culinary: '"bedste restauranter" OR "Michelin-stjerne"',
  },
  Austria: {
    lang: 'de',
    highlights: '"Sehenswürdigkeiten" OR "was tun in"',
    hidden_gems: '"Geheimtipps" OR "versteckte Orte"',
    heritage: '"UNESCO-Welterbe" OR "historische Denkmäler"',
    nature: '"Nationalparks" OR "Wanderwege" OR "Aussichtspunkte"',
    culinary: '"beste Restaurants" OR "Michelin-Stern" OR "kulinarische Erlebnisse"',
  },
  Switzerland: {
    lang: 'de',
    highlights: '"Sehenswürdigkeiten" OR "was tun in"',
    hidden_gems: '"Geheimtipps" OR "versteckte Orte"',
    heritage: '"UNESCO-Welterbe" OR "historische Denkmäler"',
    nature: '"Nationalparks" OR "Wanderwege" OR "Aussichtspunkte"',
    culinary: '"beste Restaurants" OR "Michelin-Stern"',
  },
  Belgium: {
    lang: 'fr',
    highlights: '"que faire à" OR "incontournables"',
    hidden_gems: '"lieux secrets" OR "pépites méconnues"',
    heritage: '"sites UNESCO" OR "monuments historiques"',
    nature: '"parcs nationaux" OR "randonnées" OR "points de vue"',
    culinary: '"meilleurs restaurants" OR "étoile Michelin"',
  },
  Greece: {
    lang: 'el',
    highlights: '"τι να κάνετε" OR "αξιοθέατα"',
    hidden_gems: '"κρυφά μέρη" OR "άγνωστα μέρη"',
    heritage: '"μνημεία UNESCO" OR "αρχαιολογικοί χώροι"',
    nature: '"εθνικά πάρκα" OR "μονοπάτια" OR "θέα"',
    culinary: '"καλύτερα εστιατόρια" OR "γαστρονομία"',
  },
  Croatia: {
    lang: 'hr',
    highlights: '"što raditi u" OR "znamenitosti"',
    hidden_gems: '"skrivene ljepote" OR "nepoznata mjesta"',
    heritage: '"UNESCO baština" OR "povijesni spomenici"',
    nature: '"nacionalni parkovi" OR "planinarski putevi" OR "vidikovci"',
    culinary: '"najbolji restorani" OR "gastronomija"',
  },
  'Czech Republic': {
    lang: 'cs',
    highlights: '"co dělat v" OR "pamětihodnosti"',
    hidden_gems: '"skryté poklady" OR "neznámá místa"',
    heritage: '"UNESCO památky" OR "historické památky"',
    nature: '"národní parky" OR "turistické trasy" OR "vyhlídky"',
    culinary: '"nejlepší restaurace" OR "gastronomie"',
  },
  Czechia: {
    lang: 'cs',
    highlights: '"co dělat v" OR "pamětihodnosti"',
    hidden_gems: '"skryté poklady" OR "neznámá místa"',
    heritage: '"UNESCO památky" OR "historické památky"',
    nature: '"národní parky" OR "turistické trasy" OR "vyhlídky"',
    culinary: '"nejlepší restaurace" OR "gastronomie"',
  },
  Poland: {
    lang: 'pl',
    highlights: '"co robić w" OR "atrakcje turystyczne"',
    hidden_gems: '"ukryte perły" OR "nieznane miejsca"',
    heritage: '"zabytki UNESCO" OR "zabytki historyczne"',
    nature: '"parki narodowe" OR "szlaki turystyczne" OR "punkty widokowe"',
    culinary: '"najlepsze restauracje" OR "gastronomia"',
  },
  Hungary: {
    lang: 'hu',
    highlights: '"mit csinálni" OR "látnivalók"',
    hidden_gems: '"rejtett kincsek" OR "ismeretlen helyek"',
    heritage: '"UNESCO helyszínek" OR "történelmi emlékek"',
    nature: '"nemzeti parkok" OR "túraútvonalak" OR "kilátók"',
    culinary: '"legjobb éttermek" OR "gasztronómia"',
  },
  Romania: {
    lang: 'ro',
    highlights: '"ce să faci în" OR "obiective turistice"',
    hidden_gems: '"locuri ascunse" OR "comori necunoscute"',
    heritage: '"situri UNESCO" OR "monumente istorice"',
    nature: '"parcuri naționale" OR "trasee" OR "puncte panoramice"',
    culinary: '"cele mai bune restaurante" OR "gastronomie"',
  },
  Turkey: {
    lang: 'tr',
    highlights: '"yapılacak şeyler" OR "gezilecek yerler"',
    hidden_gems: '"gizli hazineler" OR "bilinmeyen yerler"',
    heritage: '"UNESCO alanları" OR "tarihi yerler"',
    nature: '"milli parklar" OR "yürüyüş rotaları" OR "manzara noktaları"',
    culinary: '"en iyi restoranlar" OR "mutfak deneyimleri"',
  },
};

// ---------------------------------------------------------------------------
// SearXNG API client
// ---------------------------------------------------------------------------

async function querySearxng(baseUrl: string, query: string, lang: string = 'en'): Promise<SearxngResult[]> {
  const url = new URL('/search', baseUrl);
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('language', lang);

  try {
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      console.warn(`[searxng] Query failed ${res.status}: ${query.slice(0, 80)}...`);
      return [];
    }
    const data: SearxngResponse = await res.json();
    return (data.results ?? []).slice(0, 10);
  } catch (err) {
    console.warn(`[searxng] Request failed:`, err instanceof Error ? err.message : err);
    return [];
  }
}

function buildExclusionSuffix(knownNames: string[], limit: number = 10): string {
  if (knownNames.length === 0) return '';
  return ' ' + knownNames.slice(0, limit).map((n) => `-"${n}"`).join(' ');
}

// ---------------------------------------------------------------------------
// Result formatting
// ---------------------------------------------------------------------------

function formatResults(resultsByCategory: Map<SearchCategory, SearxngResult[]>): string {
  const lines: string[] = ['## Web Research Results', ''];

  let idx = 1;
  for (const cat of CATEGORIES) {
    const results = resultsByCategory.get(cat);
    if (!results || results.length === 0) continue;

    lines.push(`### ${CATEGORY_LABELS[cat]}`);
    for (const r of results) {
      const snippet = r.content ? ` — ${r.content.slice(0, 200)}` : '';
      lines.push(`${idx}. **${r.title}** (${r.url})${snippet}`);
      idx++;
    }
    lines.push('');
  }

  return lines.join('\n');
}

function mergeResults(
  target: Map<SearchCategory, SearxngResult[]>,
  category: SearchCategory,
  results: SearxngResult[],
): void {
  const existing = target.get(category) ?? [];
  for (const r of results) {
    if (!existing.some((e) => e.url === r.url)) {
      existing.push(r);
    }
  }
  target.set(category, existing);
}

// ---------------------------------------------------------------------------
// Public API — route chunk search
// ---------------------------------------------------------------------------

export async function searchForChunk(
  baseUrl: string,
  chunk: RouteChunk,
  knownNames: string[],
): Promise<string> {
  const ctx = extractContext(chunk);
  const exclusion = buildExclusionSuffix(knownNames);

  const queries: Array<{ category: SearchCategory; query: string; lang: string }> = [];

  // English queries
  for (const tmpl of ENGLISH_QUERIES) {
    queries.push({
      category: tmpl.category,
      query: `${tmpl.build(ctx)}${exclusion}`,
      lang: 'en',
    });
  }

  // Local-language queries per country
  for (const country of ctx.countries) {
    const terms = COUNTRY_SEARCH_TERMS[country];
    if (!terms) continue;

    const cityStr = ctx.cities.slice(0, 2).join(' ');
    const regionStr = ctx.regions[0] ?? country;

    for (const cat of CATEGORIES) {
      const locationHint = cat === 'culinary' || cat === 'highlights' ? cityStr : regionStr;
      queries.push({
        category: cat,
        query: `${terms[cat]} ${locationHint}${exclusion}`,
        lang: terms.lang,
      });
    }
  }

  // Execute all queries in parallel
  const results = await Promise.all(
    queries.map(async (q) => ({
      category: q.category,
      results: await querySearxng(baseUrl, q.query, q.lang),
    })),
  );

  // Merge by category, deduplicate by URL
  const byCategory = new Map<SearchCategory, SearxngResult[]>();
  for (const { category, results: res } of results) {
    mergeResults(byCategory, category, res);
  }

  const formatted = formatResults(byCategory);
  const totalResults = [...byCategory.values()].reduce((sum, arr) => sum + arr.length, 0);
  console.log(`[searxng] Chunk search: ${queries.length} queries, ${totalResults} unique results`);

  return totalResults > 0 ? formatted : '';
}

// ---------------------------------------------------------------------------
// Public API — bounds-based search
// ---------------------------------------------------------------------------

export async function searchForBounds(
  baseUrl: string,
  bounds: BoundsArea,
  knownNames: string[],
): Promise<string> {
  const centerLat = (bounds.south + bounds.north) / 2;
  const centerLng = (bounds.west + bounds.east) / 2;
  const exclusion = buildExclusionSuffix(knownNames);

  const locationHint = `near ${centerLat.toFixed(2)},${centerLng.toFixed(2)}`;

  const queries: Array<{ category: SearchCategory; query: string; lang: string }> = [
    { category: 'highlights', query: `"best things to do" OR "top attractions" ${locationHint}${exclusion}`, lang: 'en' },
    { category: 'hidden_gems', query: `"hidden gems" OR "off the beaten path" ${locationHint}${exclusion}`, lang: 'en' },
    { category: 'heritage', query: `"UNESCO sites" OR "heritage sites" OR "historic landmarks" ${locationHint}${exclusion}`, lang: 'en' },
    { category: 'nature', query: `"national parks" OR "scenic viewpoints" OR "best hikes" ${locationHint}${exclusion}`, lang: 'en' },
    { category: 'culinary', query: `"Michelin" OR "best restaurants" OR "food experiences" ${locationHint}${exclusion}`, lang: 'en' },
  ];

  const results = await Promise.all(
    queries.map(async (q) => ({
      category: q.category,
      results: await querySearxng(baseUrl, q.query, q.lang),
    })),
  );

  const byCategory = new Map<SearchCategory, SearxngResult[]>();
  for (const { category, results: res } of results) {
    mergeResults(byCategory, category, res);
  }

  const formatted = formatResults(byCategory);
  const totalResults = [...byCategory.values()].reduce((sum, arr) => sum + arr.length, 0);
  console.log(`[searxng] Bounds search: ${queries.length} queries, ${totalResults} unique results`);

  return totalResults > 0 ? formatted : '';
}
