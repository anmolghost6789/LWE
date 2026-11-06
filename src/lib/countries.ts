export interface CountryConfig {
  code: string
  name: string
  dialCode: string
  flag: string
  placeholder: string
  minDigits: number
  maxDigits: number
  pattern?: RegExp
  hint: string
}

export const COUNTRIES: CountryConfig[] = [
  {
    code: 'IN',
    name: 'India',
    dialCode: '+91',
    flag: '🇮🇳',
    placeholder: '98765 43210',
    minDigits: 10,
    maxDigits: 10,
    pattern: /^[6-9]\d{9}$/,
    hint: '10 digits starting with 6, 7, 8, or 9',
  },
  {
    code: 'US',
    name: 'United States',
    dialCode: '+1',
    flag: '🇺🇸',
    placeholder: '(555) 012-3456',
    minDigits: 10,
    maxDigits: 10,
    pattern: /^\d{10}$/,
    hint: '10-digit phone number',
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    dialCode: '+44',
    flag: '🇬🇧',
    placeholder: '7911 123456',
    minDigits: 10,
    maxDigits: 10,
    pattern: /^\d{10}$/,
    hint: '10 digits (without leading 0)',
  },
  {
    code: 'CA',
    name: 'Canada',
    dialCode: '+1',
    flag: '🇨🇦',
    placeholder: '(555) 012-3456',
    minDigits: 10,
    maxDigits: 10,
    pattern: /^\d{10}$/,
    hint: '10-digit phone number',
  },
  {
    code: 'AE',
    name: 'United Arab Emirates',
    dialCode: '+971',
    flag: '🇦🇪',
    placeholder: '50 123 4567',
    minDigits: 9,
    maxDigits: 9,
    pattern: /^\d{9}$/,
    hint: '9-digit phone number',
  },
  {
    code: 'SG',
    name: 'Singapore',
    dialCode: '+65',
    flag: '🇸🇬',
    placeholder: '8123 4567',
    minDigits: 8,
    maxDigits: 8,
    pattern: /^[89]\d{7}$/,
    hint: '8 digits starting with 8 or 9',
  },
  {
    code: 'AU',
    name: 'Australia',
    dialCode: '+61',
    flag: '🇦🇺',
    placeholder: '412 345 678',
    minDigits: 9,
    maxDigits: 9,
    pattern: /^\d{9}$/,
    hint: '9 digits (without leading 0)',
  },
  {
    code: 'DE',
    name: 'Germany',
    dialCode: '+49',
    flag: '🇩🇪',
    placeholder: '151 23456789',
    minDigits: 10,
    maxDigits: 11,
    pattern: /^\d{10,11}$/,
    hint: '10 to 11 digits',
  },
  {
    code: 'FR',
    name: 'France',
    dialCode: '+33',
    flag: '🇫🇷',
    placeholder: '6 12 34 56 78',
    minDigits: 9,
    maxDigits: 9,
    pattern: /^\d{9}$/,
    hint: '9 digits (without leading 0)',
  },
  {
    code: 'NL',
    name: 'Netherlands',
    dialCode: '+31',
    flag: '🇳🇱',
    placeholder: '6 12345678',
    minDigits: 9,
    maxDigits: 9,
    pattern: /^\d{9}$/,
    hint: '9 digits',
  },
  {
    code: 'IE',
    name: 'Ireland',
    dialCode: '+353',
    flag: '🇮🇪',
    placeholder: '83 123 4567',
    minDigits: 9,
    maxDigits: 9,
    pattern: /^\d{9}$/,
    hint: '9 digits',
  },
  {
    code: 'CH',
    name: 'Switzerland',
    dialCode: '+41',
    flag: '🇨🇭',
    placeholder: '78 123 45 67',
    minDigits: 9,
    maxDigits: 9,
    pattern: /^\d{9}$/,
    hint: '9 digits',
  },
  {
    code: 'SA',
    name: 'Saudi Arabia',
    dialCode: '+966',
    flag: '🇸🇦',
    placeholder: '50 123 4567',
    minDigits: 9,
    maxDigits: 9,
    pattern: /^\d{9}$/,
    hint: '9 digits starting with 5',
  },
  {
    code: 'QA',
    name: 'Qatar',
    dialCode: '+974',
    flag: '🇶🇦',
    placeholder: '3312 3456',
    minDigits: 8,
    maxDigits: 8,
    pattern: /^\d{8}$/,
    hint: '8 digits',
  },
  {
    code: 'JP',
    name: 'Japan',
    dialCode: '+81',
    flag: '🇯🇵',
    placeholder: '90 1234 5678',
    minDigits: 10,
    maxDigits: 10,
    pattern: /^\d{10}$/,
    hint: '10 digits (without leading 0)',
  },
  {
    code: 'KR',
    name: 'South Korea',
    dialCode: '+82',
    flag: '🇰🇷',
    placeholder: '10 1234 5678',
    minDigits: 9,
    maxDigits: 10,
    pattern: /^\d{9,10}$/,
    hint: '9 to 10 digits',
  },
  {
    code: 'BR',
    name: 'Brazil',
    dialCode: '+55',
    flag: '🇧🇷',
    placeholder: '11 91234 5678',
    minDigits: 10,
    maxDigits: 11,
    pattern: /^\d{10,11}$/,
    hint: '10 to 11 digits',
  },
  {
    code: 'ZA',
    name: 'South Africa',
    dialCode: '+27',
    flag: '🇿🇦',
    placeholder: '71 123 4567',
    minDigits: 9,
    maxDigits: 9,
    pattern: /^\d{9}$/,
    hint: '9 digits',
  },
  {
    code: 'NZ',
    name: 'New Zealand',
    dialCode: '+64',
    flag: '🇳🇿',
    placeholder: '21 123 4567',
    minDigits: 8,
    maxDigits: 10,
    pattern: /^\d{8,10}$/,
    hint: '8 to 10 digits',
  },
  {
    code: 'ES',
    name: 'Spain',
    dialCode: '+34',
    flag: '🇪🇸',
    placeholder: '612 34 56 78',
    minDigits: 9,
    maxDigits: 9,
    pattern: /^\d{9}$/,
    hint: '9 digits',
  },
  {
    code: 'IT',
    name: 'Italy',
    dialCode: '+39',
    flag: '🇮🇹',
    placeholder: '312 345 6789',
    minDigits: 9,
    maxDigits: 10,
    pattern: /^\d{9,10}$/,
    hint: '9 to 10 digits',
  },
  {
    code: 'SE',
    name: 'Sweden',
    dialCode: '+46',
    flag: '🇸🇪',
    placeholder: '70 123 45 67',
    minDigits: 9,
    maxDigits: 9,
    pattern: /^\d{9}$/,
    hint: '9 digits',
  },
  {
    code: 'OTHER',
    name: 'Other / International',
    dialCode: '+',
    flag: '🌐',
    placeholder: 'Country code and phone number',
    minDigits: 7,
    maxDigits: 15,
    pattern: /^\d{7,15}$/,
    hint: '7 to 15 digits',
  },
]

export function getCountryByCode(code: string): CountryConfig {
  return COUNTRIES.find((c) => c.code === code) || COUNTRIES[0]
}

export function validatePhoneByCountry(country: CountryConfig, rawPhone: string): string | null {
  const trimmed = rawPhone.trim()
  if (!trimmed) {
    return 'Phone number is required.'
  }

  let digits = trimmed.replace(/\D/g, '')

  if (['GB', 'AU', 'FR', 'JP'].includes(country.code) && digits.startsWith('0')) {
    digits = digits.slice(1)
  }

  if (country.code === 'IN') {
    if (digits.length !== 10) {
      return 'Indian mobile numbers must be exactly 10 digits.'
    }
    if (!/^[6-9]/.test(digits)) {
      return 'Indian mobile numbers must start with 6, 7, 8, or 9.'
    }
    return null
  }

  if (country.code === 'US' || country.code === 'CA') {
    if (digits.length !== 10) {
      return `${country.name} phone numbers must be exactly 10 digits.`
    }
    return null
  }

  if (country.pattern && !country.pattern.test(digits)) {
    return `Please enter a valid ${country.name} number (${country.hint}).`
  }

  if (digits.length < country.minDigits || digits.length > country.maxDigits) {
    return `Please enter between ${country.minDigits} and ${country.maxDigits} digits for ${country.name}.`
  }

  return null
}

