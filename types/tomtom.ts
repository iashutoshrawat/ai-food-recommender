// TomTom API TypeScript Definitions

export interface TomTomPosition {
  lat: number;
  lon: number;
}

export interface TomTomAddress {
  streetNumber?: string;
  streetName?: string;
  municipality?: string;
  countrySubdivision?: string;
  countrySubdivisionName?: string;
  countryCode?: string;
  country?: string;
  countryCodeISO3?: string;
  postalCode?: string;
  freeformAddress?: string;
  localName?: string;
}

export interface TomTomPOI {
  name: string;
  phone?: string;
  categorySet?: Array<{
    id: number;
  }>;
  categories?: string[];
  classifications?: Array<{
    code: string;
    names: Array<{
      nameLocale: string;
      name: string;
    }>;
  }>;
}

export interface TomTomViewport {
  topLeftPoint: TomTomPosition;
  btmRightPoint: TomTomPosition;
}

export interface TomTomSearchResult {
  type: string;
  id: string;
  score: number;
  address: TomTomAddress;
  position: TomTomPosition;
  viewport?: TomTomViewport;
  poi?: TomTomPOI;
  dist?: number;
  info?: string;
}

export interface TomTomSearchResponse {
  summary: {
    query: string;
    queryType: string;
    queryTime: number;
    numResults: number;
    offset: number;
    totalResults: number;
    fuzzyLevel: number;
  };
  results: TomTomSearchResult[];
}

export interface TomTomReverseGeocodeResult {
  address: TomTomAddress;
  position?: string;
}

export interface TomTomReverseGeocodeResponse {
  summary: {
    queryTime: number;
    numResults: number;
  };
  addresses: TomTomReverseGeocodeResult[];
}

export interface TomTomAutocompleteResult {
  type: string;
  id: string;
  address: TomTomAddress;
  position?: TomTomPosition;
}

export interface TomTomAutocompleteResponse {
  summary: {
    query: string;
    queryType: string;
    queryTime: number;
    numResults: number;
    offset: number;
    totalResults: number;
    fuzzyLevel: number;
  };
  results: TomTomAutocompleteResult[];
}

// Error Types
export interface TomTomError {
  error?: {
    code: string;
    message: string;
  };
  errorText?: string;
  httpStatusCode?: number;
}

// Configuration
export interface TomTomConfig {
  apiKey: string;
  baseUrl?: string;
  language?: string;
  countrySet?: string;
  limit?: number;
}

// Search Parameters
export interface TomTomSearchParams {
  query: string;
  limit?: number;
  countrySet?: string;
  language?: string;
  lat?: number;
  lon?: number;
  radius?: number;
}

export interface TomTomReverseGeocodeParams {
  lat: number;
  lon: number;
  radius?: number;
  language?: string;
}

export interface TomTomAutocompleteParams {
  query: string;
  limit?: number;
  countrySet?: string;
  language?: string;
  lat?: number;
  lon?: number;
  radius?: number;
}