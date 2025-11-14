import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Alert, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { LocationData } from '../shared/types/database';
import { getDirections, calculateDistance, formatDistance } from '../shared/utils/locationUtils';

interface LocationDisplayProps {
  location: LocationData;
  showMap?: boolean;
  showDirectionsButton?: boolean;
  compact?: boolean;
}

const { width } = Dimensions.get('window');

export default function LocationDisplay({
  location,
  showMap = true,
  showDirectionsButton = true,
  compact = false,
}: LocationDisplayProps) {
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
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
      setUserLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
      });

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
    <View style={compact ? styles.compactContainer : styles.container}>
      <View style={styles.locationInfo}>
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

      {showMap && (
        <View style={compact ? styles.compactMapContainer : styles.mapContainer}>
          <MapView
            style={styles.map}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            initialRegion={{
              latitude: location.latitude,
              longitude: location.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            scrollEnabled={!compact}
            zoomEnabled={!compact}
            pitchEnabled={false}
            rotateEnabled={false}
          >
            <Marker
              coordinate={{
                latitude: location.latitude,
                longitude: location.longitude,
              }}
              title={location.location_name}
              description={location.address}
            />
          </MapView>
        </View>
      )}

      {showDirectionsButton && (
        <TouchableOpacity style={styles.directionsButton} onPress={handleGetDirections}>
          <Text style={styles.directionsIcon}>🧭</Text>
          <Text style={styles.directionsText}>Get Directions</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  compactContainer: {
    marginVertical: 12,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  locationIcon: {
    fontSize: 20,
    marginRight: 8,
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
  mapContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  compactMapContainer: {
    height: 120,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  directionsIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  directionsText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
