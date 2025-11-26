import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import * as Location from 'expo-location';
import { LocationData } from '../shared/types/database';
import { getDirections, calculateDistance, formatDistance } from '../shared/utils/locationUtils';

interface LocationDisplayProps {
  location: LocationData;
}

export default function LocationDisplay({ location }: LocationDisplayProps) {
  const [distance, setDistance] = useState<number | null>(null);

  useEffect(() => {
    getUserLocation();
  }, []);

  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});

      if (location.latitude && location.longitude) {
        const dist = calculateDistance(
          currentLocation.coords.latitude,
          currentLocation.coords.longitude,
          location.latitude,
          location.longitude
        );
        setDistance(dist);
      }
    } catch (error) {
      console.error('Error getting user location:', error);
    }
  };

  const handleGetDirections = async () => {
    if (location.latitude && location.longitude) {
      try {
        await getDirections(location.latitude, location.longitude, location.location_name);
      } catch (error) {
        Alert.alert('Error', 'Unable to open maps for directions');
      }
    }
  };

  if (!location.latitude || !location.longitude) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.locationHeader}>
        <Text style={styles.locationIcon}>📍</Text>
        <View style={styles.locationTextContainer}>
          <Text style={styles.locationName}>{location.location_name}</Text>
          {location.address && (
            <Text style={styles.locationAddress} numberOfLines={2}>
              {location.address}
            </Text>
          )}
          {distance !== null && (
            <Text style={styles.distance}>
              {formatDistance(distance)} away
            </Text>
          )}
        </View>
      </View>

      <TouchableOpacity style={styles.directionsButton} onPress={handleGetDirections}>
        <Text style={styles.directionsIcon}>🧭</Text>
        <Text style={styles.directionsText}>Get Directions</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  locationIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  locationTextContainer: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 4,
  },
  distance: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '500',
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  directionsIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  directionsText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
