'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';
import { Country } from '@/types';
import { fetchCountries, getCountryDialCode, searchCountries } from '@/lib/countryService';
import { cn } from '@/lib/utils';
import { captureException } from '@/lib/errorTracking';

interface CountrySelectorProps {
  /** Must match the id of the associated <label htmlFor>. */
  id?: string;
  value: string;
  onChange: (countryCode: string) => void;
  error?: string;
  disabled?: boolean;
}

export function CountrySelector({
  id = 'countryCode',
  value,
  onChange,
  error,
  disabled,
}: CountrySelectorProps) {
  const [countries, setCountries] = useState<Country[]>([]);
  const [filteredCountries, setFilteredCountries] = useState<Country[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load countries on mount
  useEffect(() => {
    const loadCountries = async () => {
      try {
        setIsLoading(true);
        const countriesData = await fetchCountries();
        setCountries(countriesData);
        setFilteredCountries(countriesData);
        
        // Set default selected country (US)
        if (!value) {
          const defaultCountry = countriesData.find(c => c.cca2 === 'US');
          if (defaultCountry) {
            const dialCode = getCountryDialCode(defaultCountry);
            setSelectedCountry(defaultCountry);
            onChange(dialCode);
          }
        } else {
          // Find selected country by dial code
          const selected = countriesData.find(c => getCountryDialCode(c) === value);
          setSelectedCountry(selected || null);
        }
      } catch (error) {
        captureException(error, 'Failed to load countries');
      } finally {
        setIsLoading(false);
      }
    };

    loadCountries();
  }, [onChange, value]);

  // Update selected country when value changes
  useEffect(() => {
    if (countries.length > 0 && value) {
      const selected = countries.find(c => getCountryDialCode(c) === value);
      setSelectedCountry(selected || null);
    }
  }, [value, countries]);

  // Filter countries based on search query
  useEffect(() => {
    const filtered = searchCountries(countries, searchQuery);
    setFilteredCountries(filtered);
  }, [countries, searchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleCountrySelect = (country: Country) => {
    const dialCode = getCountryDialCode(country);
    setSelectedCountry(country);
    onChange(dialCode);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleToggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      setSearchQuery('');
    }
  };

  if (isLoading) {
    return (
      <div className="relative">
        <div
          id={id}
          role="status"
          aria-busy="true"
          aria-label="Country"
          className={cn(
            "flex items-center justify-between w-full px-3 py-2 text-sm border rounded-md",
            "bg-muted border-input text-muted-foreground cursor-not-allowed"
          )}
        >
          <span>Loading countries...</span>
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? `${id}-listbox` : undefined}
        onClick={handleToggleDropdown}
        disabled={disabled}
        className={cn(
          "flex items-center justify-between w-full px-3 py-2 text-sm border rounded-md transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
          error
            ? "border-destructive bg-destructive/10 text-destructive"
            : "border-input bg-background text-foreground hover:bg-accent",
          disabled && "bg-muted text-muted-foreground cursor-not-allowed",
          isOpen && "ring-2 ring-ring border-transparent"
        )}
      >
        <div className="flex items-center space-x-2">
          {selectedCountry ? (
            <>
              <span className="text-lg">{selectedCountry.flag}</span>
              <span className="font-medium">{getCountryDialCode(selectedCountry)}</span>
              <span className="text-muted-foreground truncate">{selectedCountry.name.common}</span>
            </>
          ) : (
            <span className="text-muted-foreground">Select country</span>
          )}
        </div>
        <ChevronDown className={cn(
          "w-4 h-4 transition-transform",
          isOpen && "transform rotate-180"
        )} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                ref={searchInputRef}
                id={`${id}-search`}
                type="text"
                placeholder="Search countries..."
                aria-label="Search countries"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent bg-background"
              />
            </div>
          </div>

          {/* Countries list */}
          <div
            id={`${id}-listbox`}
            role="listbox"
            aria-label="Countries"
            className="overflow-y-auto max-h-48"
          >
            {filteredCountries.length > 0 ? (
              filteredCountries.map((country) => {
                const dialCode = getCountryDialCode(country);
                const isSelected = selectedCountry?.cca2 === country.cca2;

                return (
                  <button
                    key={country.cca2}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleCountrySelect(country)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-accent transition-colors",
                      isSelected && "bg-primary/10 text-primary"
                    )}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">{country.flag}</span>
                      <span className="font-medium">{dialCode}</span>
                      <span className="truncate">{country.name.common}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-primary" />}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-2 text-sm text-muted-foreground text-center">
                No countries found
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <p className="mt-1 text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
