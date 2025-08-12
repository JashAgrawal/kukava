import { Country, CountryApiResponse } from '@/types';

const COUNTRIES_API_URL = 'https://restcountries.com/v3.1/all?fields=name,cca2,cca3,idd,flag';

// Cache for countries data
let countriesCache: Country[] | null = null;

// Popular countries to show first
const POPULAR_COUNTRIES = ['US', 'GB', 'CA', 'AU', 'IN', 'DE', 'FR', 'JP', 'CN', 'BR'];

export async function fetchCountries(): Promise<Country[]> {
  // Return cached data if available
  if (countriesCache) {
    return countriesCache;
  }

  try {
    const response = await fetch(COUNTRIES_API_URL);
    if (!response.ok) {
      throw new Error('Failed to fetch countries');
    }

    const data: CountryApiResponse[] = await response.json();
    
    // Transform and filter countries with valid phone codes
    const countries: Country[] = data
      .filter(country => 
        country.idd?.root && 
        country.idd?.suffixes?.length > 0 &&
        country.name?.common
      )
      .map(country => ({
        name: {
          common: country.name.common,
          official: country.name.official || country.name.common,
        },
        cca2: country.cca2,
        cca3: country.cca3,
        idd: {
          root: country.idd.root,
          suffixes: country.idd.suffixes,
        },
        flag: country.flag,
      }))
      .sort((a, b) => {
        // Sort popular countries first, then alphabetically
        const aIsPopular = POPULAR_COUNTRIES.includes(a.cca2);
        const bIsPopular = POPULAR_COUNTRIES.includes(b.cca2);
        
        if (aIsPopular && !bIsPopular) return -1;
        if (!aIsPopular && bIsPopular) return 1;
        if (aIsPopular && bIsPopular) {
          return POPULAR_COUNTRIES.indexOf(a.cca2) - POPULAR_COUNTRIES.indexOf(b.cca2);
        }
        
        return a.name.common.localeCompare(b.name.common);
      });

    // Cache the result
    countriesCache = countries;
    return countries;
  } catch (error) {
    console.error('Error fetching countries:', error);
    
    // Return fallback data if API fails
    return getFallbackCountries();
  }
}

export function getCountryDialCode(country: Country): string {
  // Most countries have only one suffix, but some have multiple
  const suffix = country.idd.suffixes[0] || '';
  return `${country.idd.root}${suffix}`;
}

export function searchCountries(countries: Country[], query: string): Country[] {
  const trimmedQuery = query?.trim() || '';
  if (!trimmedQuery) return countries;

  const searchTerm = trimmedQuery.toLowerCase();

  return countries.filter(country =>
    country.name.common.toLowerCase().includes(searchTerm) ||
    country.name.official.toLowerCase().includes(searchTerm) ||
    country.cca2.toLowerCase().includes(searchTerm) ||
    country.cca3.toLowerCase().includes(searchTerm) ||
    getCountryDialCode(country).includes(searchTerm)
  );
}

export function findCountryByCode(countries: Country[], code: string): Country | undefined {
  return countries.find(country => 
    country.cca2 === code || 
    country.cca3 === code ||
    getCountryDialCode(country) === code
  );
}

// Fallback countries data in case API fails
function getFallbackCountries(): Country[] {
  return [
    {
      name: { common: 'United States', official: 'United States of America' },
      cca2: 'US',
      cca3: 'USA',
      idd: { root: '+1', suffixes: [''] },
      flag: '🇺🇸',
    },
    {
      name: { common: 'United Kingdom', official: 'United Kingdom of Great Britain and Northern Ireland' },
      cca2: 'GB',
      cca3: 'GBR',
      idd: { root: '+44', suffixes: [''] },
      flag: '🇬🇧',
    },
    {
      name: { common: 'Canada', official: 'Canada' },
      cca2: 'CA',
      cca3: 'CAN',
      idd: { root: '+1', suffixes: [''] },
      flag: '🇨🇦',
    },
    {
      name: { common: 'Australia', official: 'Commonwealth of Australia' },
      cca2: 'AU',
      cca3: 'AUS',
      idd: { root: '+61', suffixes: [''] },
      flag: '🇦🇺',
    },
    {
      name: { common: 'India', official: 'Republic of India' },
      cca2: 'IN',
      cca3: 'IND',
      idd: { root: '+91', suffixes: [''] },
      flag: '🇮🇳',
    },
    {
      name: { common: 'Germany', official: 'Federal Republic of Germany' },
      cca2: 'DE',
      cca3: 'DEU',
      idd: { root: '+49', suffixes: [''] },
      flag: '🇩🇪',
    },
    {
      name: { common: 'France', official: 'French Republic' },
      cca2: 'FR',
      cca3: 'FRA',
      idd: { root: '+33', suffixes: [''] },
      flag: '🇫🇷',
    },
    {
      name: { common: 'Japan', official: 'Japan' },
      cca2: 'JP',
      cca3: 'JPN',
      idd: { root: '+81', suffixes: [''] },
      flag: '🇯🇵',
    },
    {
      name: { common: 'China', official: "People's Republic of China" },
      cca2: 'CN',
      cca3: 'CHN',
      idd: { root: '+86', suffixes: [''] },
      flag: '🇨🇳',
    },
    {
      name: { common: 'Brazil', official: 'Federative Republic of Brazil' },
      cca2: 'BR',
      cca3: 'BRA',
      idd: { root: '+55', suffixes: [''] },
      flag: '🇧🇷',
    },
  ];
}
