// Coordinates for the cities Vetter's jobs and candidates use, so the job board can search by radius.
// Add a city here when a job or candidate uses a new one.
export const CITIES: Record<string, { lat: number; lng: number }> = {
  'San Francisco, CA': { lat: 37.7749, lng: -122.4194 },
  'San Jose, CA': { lat: 37.3382, lng: -121.8863 },
  'Oakland, CA': { lat: 37.8044, lng: -122.2712 },
  'Los Angeles, CA': { lat: 34.0522, lng: -118.2437 },
  'Seattle, WA': { lat: 47.6062, lng: -122.3321 },
  'Austin, TX': { lat: 30.2672, lng: -97.7431 },
  'Dallas, TX': { lat: 32.7767, lng: -96.797 },
  'New York, NY': { lat: 40.7128, lng: -74.006 },
  'Boston, MA': { lat: 42.3601, lng: -71.0589 },
  'Chicago, IL': { lat: 41.8781, lng: -87.6298 },
  'Toronto, CA': { lat: 43.6532, lng: -79.3832 },
  'London, UK': { lat: 51.5074, lng: -0.1278 },
  'Manchester, UK': { lat: 53.4808, lng: -2.2426 },
  'Edinburgh, UK': { lat: 55.9533, lng: -3.1883 },
  'Bristol, UK': { lat: 51.4545, lng: -2.5879 },
  'Berlin, DE': { lat: 52.52, lng: 13.405 },
  'Amsterdam, NL': { lat: 52.3676, lng: 4.9041 },
  'Lisbon, PT': { lat: 38.7223, lng: -9.1393 },
  'Bangalore, IN': { lat: 12.9716, lng: 77.5946 },
  'Singapore, SG': { lat: 1.3521, lng: 103.8198 },
  'Lagos, NG': { lat: 6.5244, lng: 3.3792 },
  'Sydney, AU': { lat: -33.8688, lng: 151.2093 },
};

// Great-circle distance in miles
export function distanceMiles(from: string, to: string): number | undefined {
  const a = CITIES[from];
  const b = CITIES[to];
  if (!a || !b) return undefined;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.sqrt(h));
}
