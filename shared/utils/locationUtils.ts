import { Linking, Platform } from 'react-native';
import { LocationData } from '../types/database';

export const extractPincodeFromAddress = (address: string): string | undefined => {
  const pincodeRegex = /\b\d{5,6}\b/;
  const match = address.match(pincodeRegex);
  return match ? match[0] : undefined;
};

export const extractCityFromAddressComponents = (addressComponents: any[]): string | undefined => {
  const cityComponent = addressComponents.find(
    (component) =>
      component.types.includes('locality') || component.types.includes('administrative_area_level_2')
  );
  return cityComponent?.long_name;
};

export const extractCountryFromAddressComponents = (addressComponents: any[]): string | undefined => {
  const countryComponent = addressComponents.find((component) =>
    component.types.includes('country')
  );
  return countryComponent?.long_name;
};

export const extractPincodeFromAddressComponents = (addressComponents: any[]): string | undefined => {
  const pincodeComponent = addressComponents.find((component) =>
    component.types.includes('postal_code')
  );
  return pincodeComponent?.long_name;
};

export const parseGooglePlaceDetails = (placeDetails: any): LocationData => {
  const { name, formatted_address, geometry, address_components, place_id } = placeDetails;

  return {
    location_name: name,
    address: formatted_address,
    latitude: geometry?.location?.lat,
    longitude: geometry?.location?.lng,
    pincode: extractPincodeFromAddressComponents(address_components || []),
    city: extractCityFromAddressComponents(address_components || []),
    country: extractCountryFromAddressComponents(address_components || []),
    place_id: place_id,
  };
};

export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 10) / 10;
};

const toRad = (value: number): number => {
  return (value * Math.PI) / 180;
};

export const formatDistance = (distanceKm: number): string => {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`;
  }
  return `${distanceKm.toFixed(1)}km`;
};

export const openInMaps = async (latitude: number, longitude: number, label?: string) => {
  const encodedLabel = label ? encodeURIComponent(label) : '';

  let url: string;

  if (Platform.OS === 'ios') {
    url = `maps://app?daddr=${latitude},${longitude}&q=${encodedLabel}`;
  } else {
    url = `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodedLabel})`;
  }

  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      const webUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
      await Linking.openURL(webUrl);
    }
  } catch (error) {
    console.error('Error opening maps:', error);
  }
};

export const getDirections = async (
  latitude: number,
  longitude: number,
  label?: string
) => {
  const encodedLabel = label ? encodeURIComponent(label) : '';

  let url: string;

  if (Platform.OS === 'ios') {
    url = `maps://app?daddr=${latitude},${longitude}&dirflg=d`;
  } else {
    url = `google.navigation:q=${latitude},${longitude}`;
  }

  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
      await Linking.openURL(webUrl);
    }
  } catch (error) {
    console.error('Error opening directions:', error);
  }
};
