import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Phone, Search } from 'lucide-react'

import { COUNTRIES, getCountryByCode, type CountryConfig } from '../lib/countries'
import { cx } from '../lib/cx'

interface PhoneInputProps {
  countryCode: string
  phoneNumber: string
  onCountryChange: (countryCode: string) => void
  onPhoneChange: (phoneNumber: string) => void
  onBlur?: () => void
  disabled?: boolean
  hasError?: boolean
  id?: string
}

export function PhoneInput({
  countryCode,
  phoneNumber,
  onCountryChange,
  onPhoneChange,
  onBlur,
  disabled = false,
  hasError = false,
  id = 'contact-phone',
}: PhoneInputProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const selectedCountry = useMemo(() => getCountryByCode(countryCode), [countryCode])

  // Filter countries in search dropdown
  const filteredCountries = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return COUNTRIES
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.dialCode.toLowerCase().includes(q) ||
        c.dialCode.replace('+', '').includes(q),
    )
  }, [search])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Auto-focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 50)
    }
  }, [isOpen])

  // Handle phone input change with auto-dial-code detection
  function handleInputChange(val: string) {
    const trimmed = val.trim()

    // If user starts typing or pastes "+...", auto-detect matching country
    if (trimmed.startsWith('+')) {
      // Find matching country with longest dial code
      const matchingCountry = [...COUNTRIES]
        .filter((c) => c.dialCode !== '+' && trimmed.startsWith(c.dialCode))
        .sort((a, b) => b.dialCode.length - a.dialCode.length)[0]

      if (matchingCountry) {
        onCountryChange(matchingCountry.code)
        // Keep remainder of number after dial code
        const localDigits = trimmed.slice(matchingCountry.dialCode.length).trim()
        onPhoneChange(localDigits)
        return
      }
    }

    onPhoneChange(val)
  }

  function selectCountry(country: CountryConfig) {
    onCountryChange(country.code)
    setIsOpen(false)
    setSearch('')
    setTimeout(() => {
      inputRef.current?.focus()
    }, 50)
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        className={cx(
          'depth mt-2 flex h-11 items-center rounded-[12px] bg-surface-2/70 transition-colors focus-within:ring-1',
          hasError
            ? 'border border-accent-3 focus-within:ring-accent-3'
            : 'focus-within:ring-accent/50',
          disabled && 'opacity-60 pointer-events-none',
        )}
      >
        {/* Country Code Selector Trigger (Compact, inside the same field) */}
        <button
          type="button"
          onClick={() => {
            if (!disabled) {
              setIsOpen((prev) => !prev)
              setSearch('')
            }
          }}
          disabled={disabled}
          aria-expanded={isOpen}
          aria-label={`Select country code, current is ${selectedCountry.name} (${selectedCountry.dialCode})`}
          className="flex h-full w-[84px] shrink-0 items-center justify-between border-r border-line bg-transparent pl-3 pr-2 text-[13px] font-medium text-fg transition-colors hover:bg-white/[0.04] focus:outline-none"
        >
          <span className="flex items-center gap-1.5 overflow-hidden">
            <span className="text-[16px] leading-none shrink-0" aria-hidden>
              {selectedCountry.flag}
            </span>
            <span className="font-mono text-[13px] tracking-tight text-fg truncate">
              {selectedCountry.dialCode}
            </span>
          </span>
          <ChevronDown
            className={cx('size-3.5 text-muted transition-transform shrink-0', isOpen && 'rotate-180')}
          />
        </button>

        {/* Phone Number Input */}
        <div className="relative flex flex-1 items-center h-full">
          <input
            ref={inputRef}
            id={id}
            type="tel"
            autoComplete="tel-national"
            placeholder={selectedCountry.placeholder}
            value={phoneNumber}
            onChange={(e) => handleInputChange(e.target.value)}
            onBlur={onBlur}
            disabled={disabled}
            className="h-full w-full bg-transparent px-3 pl-8 text-[14px] text-fg placeholder:text-muted/40 focus:outline-none"
          />
          <Phone className="pointer-events-none absolute left-2.5 size-3.5 text-muted/60" />
        </div>
      </div>

      {/* Floating Country Dropdown Menu */}
      {isOpen && (
        <div className="depth absolute top-full left-0 z-50 mt-1.5 flex w-72 max-h-72 flex-col rounded-[14px] bg-surface border border-line-strong p-2 shadow-[0_20px_50px_rgba(0,0,0,0.85)] backdrop-blur-xl">
          {/* Search filter inside dropdown */}
          <div className="relative mb-2 shrink-0">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search country or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-[8px] bg-surface-2 px-3 py-1.5 pl-8 text-[12px] text-fg placeholder:text-muted/50 focus:outline-none focus:ring-1 focus:ring-accent/50"
            />
            <Search className="pointer-events-none absolute left-2.5 top-2 size-3.5 text-muted" />
          </div>

          {/* List of Countries */}
          <div className="flex-1 overflow-y-auto space-y-0.5 pr-1">
            {filteredCountries.length === 0 ? (
              <p className="py-4 text-center text-[12px] text-muted">No countries found</p>
            ) : (
              filteredCountries.map((c) => {
                const isSelected = c.code === countryCode
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => selectCountry(c)}
                    className={cx(
                      'flex w-full items-center justify-between rounded-[8px] px-2.5 py-1.5 text-left text-[13px] transition-colors',
                      isSelected
                        ? 'bg-accent/15 text-accent font-medium'
                        : 'text-fg/90 hover:bg-white/[0.06]',
                    )}
                  >
                    <span className="flex items-center gap-2 overflow-hidden">
                      <span className="text-[16px] leading-none shrink-0" aria-hidden>
                        {c.flag}
                      </span>
                      <span className="truncate">{c.name}</span>
                    </span>
                    <span className="font-mono text-[12px] text-muted shrink-0 pl-2">
                      {c.dialCode}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

