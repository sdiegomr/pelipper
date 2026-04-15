import Amadeus from 'amadeus';

const amadeus = new Amadeus({
  clientId: process.env.AMADEUS_CLIENT_ID || '',
  clientSecret: process.env.AMADEUS_CLIENT_SECRET || '',
  hostname: process.env.AMADEUS_ENV === 'production' ? 'production' : 'test',
});

export interface AirportResult {
  iataCode: string;
  name: string;
  cityName: string;
  countryCode: string;
}

export async function searchAirports(keyword: string): Promise<AirportResult[]> {
  const response = await amadeus.referenceData.locations.get({
    keyword,
    subType: 'AIRPORT,CITY',
  });
  return (response.data || []).map((loc: any) => ({
    iataCode: loc.iataCode || '',
    name: loc.name || '',
    cityName: loc.address?.cityName || '',
    countryCode: loc.address?.countryCode || '',
  }));
}

export interface FlightSearchParams {
  originLocationCode: string;
  destinationLocationCode: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  travelClass?: string;
  nonStop?: boolean;
  currencyCode?: string;
  max?: number;
}

export async function searchFlights(params: FlightSearchParams): Promise<any[]> {
  const query: Record<string, string> = {
    originLocationCode: params.originLocationCode,
    destinationLocationCode: params.destinationLocationCode,
    departureDate: params.departureDate,
    adults: String(params.adults),
    max: String(params.max ?? 50),
  };
  if (params.returnDate) query.returnDate = params.returnDate;
  if (params.travelClass) query.travelClass = params.travelClass;
  if (params.nonStop !== undefined) query.nonStop = String(params.nonStop);
  if (params.currencyCode) query.currencyCode = params.currencyCode;

  const response = await amadeus.shopping.flightOffersSearch.get(query);
  return response.data || [];
}
