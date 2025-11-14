import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { ClassWithDetails } from '../shared/types/database';

interface ClassLocationsMapProps {
  classes: ClassWithDetails[];
  onMarkerPress?: (classId: string) => void;
}

export default function ClassLocationsMap({ classes, onMarkerPress }: ClassLocationsMapProps) {
  const classesWithLocation = classes.filter(
    (c) => c.latitude && c.longitude
  );

  if (classesWithLocation.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📍</Text>
        <Text style={styles.emptyText}>No class locations set</Text>
        <Text style={styles.emptySubtext}>Add locations to classes to see them on the map</Text>
      </View>
    );
  }

  const getMapRegion = () => {
    const latitudes = classesWithLocation.map((c) => c.latitude!);
    const longitudes = classesWithLocation.map((c) => c.longitude!);

    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);

    const midLat = (minLat + maxLat) / 2;
    const midLng = (minLng + maxLng) / 2;
    const deltaLat = (maxLat - minLat) * 1.5 || 0.05;
    const deltaLng = (maxLng - minLng) * 1.5 || 0.05;

    return {
      latitude: midLat,
      longitude: midLng,
      latitudeDelta: Math.max(deltaLat, 0.05),
      longitudeDelta: Math.max(deltaLng, 0.05),
    };
  };

  const getPinColor = (index: number): string => {
    const colors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];
    return colors[index % colors.length];
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Class Locations</Text>
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          initialRegion={getMapRegion()}
        >
          {classesWithLocation.map((classItem, index) => (
            <Marker
              key={classItem.id}
              coordinate={{
                latitude: classItem.latitude!,
                longitude: classItem.longitude!,
              }}
              title={classItem.name}
              description={classItem.address}
              pinColor={getPinColor(index)}
              onPress={() => onMarkerPress && onMarkerPress(classItem.id)}
            />
          ))}
        </MapView>
      </View>
      <View style={styles.legend}>
        {classesWithLocation.map((classItem, index) => (
          <View key={classItem.id} style={styles.legendItem}>
            <View
              style={[styles.legendPin, { backgroundColor: getPinColor(index) }]}
            />
            <Text style={styles.legendText} numberOfLines={1}>
              {classItem.name}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  mapContainer: {
    height: 250,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    maxWidth: '48%',
  },
  legendPin: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '500',
    flex: 1,
  },
  emptyContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});
