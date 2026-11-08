// Approximate centres of Montréal neighbourhoods. The backend needs coordinates for a
// delivery address and there is no geocoding service, so customers pick the neighbourhood
// they live in (or type exact coordinates). Distances are therefore approximate.
export type Neighbourhood = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
};

export const montrealNeighbourhoods: Neighbourhood[] = [
  { id: 'downtown', name: 'Downtown (Centre-ville)', latitude: 45.5017, longitude: -73.5673 },
  { id: 'chinatown', name: 'Chinatown (Quartier chinois)', latitude: 45.5076, longitude: -73.5612 },
  { id: 'old-montreal', name: 'Old Montréal (Vieux-Montréal)', latitude: 45.5075, longitude: -73.5544 },
  { id: 'plateau', name: 'Plateau-Mont-Royal', latitude: 45.524, longitude: -73.58 },
  { id: 'mile-end', name: 'Mile End', latitude: 45.523, longitude: -73.598 },
  { id: 'cote-des-neiges', name: 'Côte-des-Neiges', latitude: 45.496, longitude: -73.625 },
  { id: 'westmount', name: 'Westmount', latitude: 45.484, longitude: -73.6 },
  { id: 'griffintown', name: 'Griffintown', latitude: 45.492, longitude: -73.56 },
  { id: 'saint-henri', name: 'Saint-Henri', latitude: 45.477, longitude: -73.585 },
  { id: 'verdun', name: 'Verdun', latitude: 45.458, longitude: -73.57 },
  { id: 'rosemont', name: 'Rosemont–La Petite-Patrie', latitude: 45.546, longitude: -73.588 },
];

// The neighbourhood whose centre is exactly these coordinates, if the address was saved from one.
export function findNeighbourhood(latitude: number, longitude: number) {
  return montrealNeighbourhoods.find(item => item.latitude === latitude && item.longitude === longitude);
}
