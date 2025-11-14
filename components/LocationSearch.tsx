import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { LocationData } from '../shared/types/database';
import { parseGooglePlaceDetails } from '../shared/utils/locationUtils';

interface LocationSearchProps {
  onLocationSelect: (location: LocationData) => void;
  initialValue?: string;
  placeholder?: string;
  disabled?: boolean;
}

export default function LocationSearch({
  onLocationSelect,
  initialValue = '',
  placeholder = 'Search for class location',
  disabled = false,
}: LocationSearchProps) {
  const [isLoading, setIsLoading] = useState(false);

  const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || '';

  return (
    <View style={styles.container}>
      <GooglePlacesAutocomplete
        placeholder={placeholder}
        fetchDetails={true}
        onPress={(data, details = null) => {
          if (details) {
            setIsLoading(true);
            const locationData = parseGooglePlaceDetails(details);
            onLocationSelect(locationData);
            setIsLoading(false);
          }
        }}
        query={{
          key: GOOGLE_PLACES_API_KEY,
          language: 'en',
        }}
        styles={{
          container: styles.autocompleteContainer,
          textInputContainer: styles.textInputContainer,
          textInput: styles.textInput,
          listView: styles.listView,
          row: styles.row,
          separator: styles.separator,
          description: styles.description,
          predefinedPlacesDescription: styles.predefinedPlacesDescription,
        }}
        textInputProps={{
          placeholderTextColor: '#9CA3AF',
          editable: !disabled,
        }}
        enablePoweredByContainer={false}
        minLength={2}
        debounce={400}
        renderLeftButton={() =>
          isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#6B7280" />
            </View>
          ) : null
        }
        GooglePlacesDetailsQuery={{
          fields: 'geometry,name,formatted_address,address_components,place_id',
        }}
        nearbyPlacesAPI="GooglePlacesSearch"
        disableScroll={false}
      />
      {!GOOGLE_PLACES_API_KEY && (
        <View style={styles.warningContainer}>
          <Text style={styles.warningText}>
            Google Places API key is not configured. Please add EXPO_PUBLIC_GOOGLE_PLACES_API_KEY
            to your .env file.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    zIndex: 1,
  },
  autocompleteContainer: {
    flex: 0,
  },
  textInputContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderTopWidth: 0,
    borderBottomWidth: 0,
  },
  textInput: {
    backgroundColor: '#F3F4F6',
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1F2937',
  },
  listView: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    maxHeight: 300,
  },
  row: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  separator: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  description: {
    fontSize: 15,
    color: '#1F2937',
  },
  predefinedPlacesDescription: {
    color: '#6B7280',
  },
  loadingContainer: {
    position: 'absolute',
    right: 16,
    top: 12,
    zIndex: 10,
  },
  warningContainer: {
    marginTop: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  warningText: {
    fontSize: 13,
    color: '#92400E',
  },
});
