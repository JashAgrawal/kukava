import { afterEach, describe, expect, it, vi } from 'vitest';
import { findCountryByCode, getCountryDialCode, searchCountries } from '@/lib/countryService';
import type { Country, CountryApiResponse } from '@/types';

const API_PAYLOAD: CountryApiResponse[] = [
  {
    name: { common: 'India', official: 'Republic of India' },
    cca2: 'IN',
    cca3: 'IND',
    idd: { root: '+91', suffixes: [''] },
    flag: '🇮🇳',
  },
  {
    name: { common: 'United States', official: 'United States of America' },
    cca2: 'US',
    cca3: 'USA',
    idd: { root: '+1', suffixes: [''] },
    flag: '🇺🇸',
  },
  {
    name: { common: 'Albania', official: 'Republic of Albania' },
    cca2: 'AL',
    cca3: 'ALB',
    idd: { root: '+355', suffixes: [''] },
    flag: '🇦🇱',
  },
  {
    name: { common: 'Caribbean Netherlands', official: 'Bonaire' },
    cca2: 'BQ',
    cca3: 'BES',
    idd: { root: '+', suffixes: ['599'] },
    flag: '🇧🇶',
  },
  {
    // No idd at all: must be filtered out.
    name: { common: 'Antarctica', official: '' },
    cca2: 'AQ',
    cca3: 'ATA',
    idd: { root: '', suffixes: [] },
    flag: '🇦🇶',
  },
];

function mockFetchOnce(payload: unknown, ok = true, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    status,
    json: vi.fn().mockResolvedValue(payload),
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('fetchCountries', () => {
  // fetchCountries memoises into a module-level variable, so every test needs a
  // freshly imported copy of the module to observe an unfetched cache.
  async function loadFreshModule() {
    vi.resetModules();
    return import('@/lib/countryService');
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('sorts popular countries first and the rest alphabetically', async () => {
    mockFetchOnce(API_PAYLOAD);
    const { fetchCountries } = await loadFreshModule();
    const countries = await fetchCountries();

    expect(countries.map(c => c.cca2)).toEqual(['US', 'IN', 'AL', 'BQ']);
  });

  it('orders popular countries by their configured rank', async () => {
    mockFetchOnce(API_PAYLOAD);
    const { fetchCountries } = await loadFreshModule();
    const countries = await fetchCountries();

    // POPULAR_COUNTRIES starts with US, then IN.
    expect(countries.slice(0, 2).map(c => c.cca2)).toEqual(['US', 'IN']);
  });

  it('filters out countries without a usable dial code', async () => {
    mockFetchOnce(API_PAYLOAD);
    const { fetchCountries } = await loadFreshModule();
    const countries = await fetchCountries();

    expect(countries.find(c => c.cca2 === 'AQ')).toBeUndefined();
  });

  it('preserves the first suffix when joining the dial code', async () => {
    mockFetchOnce(API_PAYLOAD);
    const { fetchCountries, getCountryDialCode } = await loadFreshModule();
    const countries = await fetchCountries();
    const bonaire = countries.find(c => c.cca2 === 'BQ');

    expect(getCountryDialCode(bonaire!)).toBe('+599');
  });

  it('falls back to the common name when the official name is blank', async () => {
    mockFetchOnce([
      {
        name: { common: 'Nowhere', official: '' },
        cca2: 'NW',
        cca3: 'NWH',
        idd: { root: '+99', suffixes: [''] },
        flag: '🏳️',
      },
    ]);
    const { fetchCountries } = await loadFreshModule();
    const countries = await fetchCountries();

    expect(countries[0].name.official).toBe('Nowhere');
  });

  it('caches the response and does not refetch', async () => {
    const fetchMock = mockFetchOnce(API_PAYLOAD);
    const { fetchCountries } = await loadFreshModule();

    const first = await fetchCountries();
    const second = await fetchCountries();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
  });

  it('returns a non-ok response as a fallback list', async () => {
    mockFetchOnce(null, false, 503);
    const { fetchCountries } = await loadFreshModule();
    const countries = await fetchCountries();

    expect(countries.length).toBeGreaterThan(0);
    expect(countries.map(c => c.cca2)).toContain('US');
    expect(countries.map(c => c.cca2)).toContain('IN');
  });

  it('falls back when the network request throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    const { fetchCountries } = await loadFreshModule();

    const countries = await fetchCountries();

    expect(countries.length).toBeGreaterThan(0);
    expect(countries[0].name.common).toBe('United States');
  });

  it('falls back when the response body is not valid JSON', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockRejectedValue(new SyntaxError('bad json')),
      })
    );
    const { fetchCountries } = await loadFreshModule();

    const countries = await fetchCountries();

    expect(countries.length).toBeGreaterThan(0);
  });

  it('returns an empty list when the API legitimately has no usable countries', async () => {
    mockFetchOnce([]);
    const { fetchCountries } = await loadFreshModule();

    await expect(fetchCountries()).resolves.toEqual([]);
  });

  it('requests the fields the UI needs', async () => {
    const fetchMock = mockFetchOnce(API_PAYLOAD);
    const { fetchCountries } = await loadFreshModule();

    await fetchCountries();

    expect(fetchMock).toHaveBeenCalledWith(
      'https://restcountries.com/v3.1/all?fields=name,cca2,cca3,idd,flag'
    );
  });
});

describe('getCountryDialCode', () => {
  it('joins the root with the first suffix', () => {
    const country: Country = {
      name: { common: 'X', official: 'X' },
      cca2: 'XX',
      cca3: 'XXX',
      idd: { root: '+12', suffixes: ['3', '4'] },
      flag: '🏳️',
    };

    expect(getCountryDialCode(country)).toBe('+123');
  });

  it('handles a missing suffix', () => {
    const country: Country = {
      name: { common: 'X', official: 'X' },
      cca2: 'XX',
      cca3: 'XXX',
      idd: { root: '+12', suffixes: [] },
      flag: '🏳️',
    };

    expect(getCountryDialCode(country)).toBe('+12');
  });
});

describe('searchCountries', () => {
  const countries: Country[] = [
    {
      name: { common: 'United States', official: 'United States of America' },
      cca2: 'US',
      cca3: 'USA',
      idd: { root: '+1', suffixes: [''] },
      flag: '🇺🇸',
    },
    {
      name: { common: 'United Kingdom', official: 'United Kingdom of Great Britain' },
      cca2: 'GB',
      cca3: 'GBR',
      idd: { root: '+44', suffixes: [''] },
      flag: '🇬🇧',
    },
    {
      name: { common: 'India', official: 'Republic of India' },
      cca2: 'IN',
      cca3: 'IND',
      idd: { root: '+91', suffixes: [''] },
      flag: '🇮🇳',
    },
  ];

  it('returns everything for an empty query', () => {
    expect(searchCountries(countries, '')).toHaveLength(3);
    expect(searchCountries(countries, '   ')).toHaveLength(3);
  });

  it('matches on the common name', () => {
    expect(searchCountries(countries, 'india').map(c => c.cca2)).toEqual(['IN']);
  });

  it('matches on the official name', () => {
    expect(searchCountries(countries, 'great britain').map(c => c.cca2)).toEqual(['GB']);
  });

  it('matches on the two-letter code', () => {
    expect(searchCountries(countries, 'gb').map(c => c.cca2)).toEqual(['GB']);
  });

  it('matches on the three-letter code', () => {
    expect(searchCountries(countries, 'usa').map(c => c.cca2)).toEqual(['US']);
  });

  it('matches on the dial code', () => {
    expect(searchCountries(countries, '+91').map(c => c.cca2)).toEqual(['IN']);
  });

  it('is case insensitive', () => {
    expect(searchCountries(countries, 'UNITED STATES')).toHaveLength(1);
  });

  it('trims the query', () => {
    expect(searchCountries(countries, '  india  ')).toHaveLength(1);
  });

  it('returns an empty array when nothing matches', () => {
    expect(searchCountries(countries, 'zzzz')).toHaveLength(0);
  });
});

describe('findCountryByCode', () => {
  const countries: Country[] = [
    {
      name: { common: 'United States', official: 'United States of America' },
      cca2: 'US',
      cca3: 'USA',
      idd: { root: '+1', suffixes: [''] },
      flag: '🇺🇸',
    },
    {
      name: { common: 'India', official: 'Republic of India' },
      cca2: 'IN',
      cca3: 'IND',
      idd: { root: '+91', suffixes: [''] },
      flag: '🇮🇳',
    },
  ];

  it('finds by two-letter code', () => {
    expect(findCountryByCode(countries, 'IN')?.cca3).toBe('IND');
  });

  it('finds by three-letter code', () => {
    expect(findCountryByCode(countries, 'USA')?.cca2).toBe('US');
  });

  it('finds by dial code', () => {
    expect(findCountryByCode(countries, '+91')?.cca2).toBe('IN');
  });

  it('returns undefined for an unknown code', () => {
    expect(findCountryByCode(countries, 'ZZ')).toBeUndefined();
  });

  it('does not match partial codes', () => {
    expect(findCountryByCode(countries, 'U')).toBeUndefined();
  });
});