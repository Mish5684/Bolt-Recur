import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { LocationData } from '../shared/types/database';
import { parseGooglePlaceDetails } from '../shared/utils/locationUtils';

interface LocationSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onLocationSelect: (location: LocationData) => void;
  placeholder?: string;
}

export default function LocationSearchModal({
  visible,
  onClose,
  onLocationSelect,
  placeholder = 'Search for class location',
}: LocationSearchModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY || '';

  const handleLocationSelect = (data: any, details: any) => {
    if (details) {
      setIsLoading(true);
      const locationData = parseGooglePlaceDetails(details);
      onLocationSelect(locationData);
      setIsLoading(false);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Search Location</Text>
          <View style={styles.closeButtonPlaceholder} />
        </View>

        <View style={styles.content}>
          <GooglePlacesAutocomplete
            placeholder={placeholder}
            fetchDetails={true}
            onPress={handleLocationSelect}
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
              autoFocus: true,
            }}
            enablePoweredByContainer={false}
            minLength={2}
            debounce={400}
            renderLeftButton={() => {
              if (isLoading) {
                return (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#6B7280" />
                  </View>
                );
              }
              return <></>;
            }}
            GooglePlacesDetailsQuery={{
              fields: 'geometry,name,formatted_address,address_components,place_id',
            }}
            nearbyPlacesAPI="GooglePlacesSearch"
            listViewDisplayed="auto"
            keyboardShouldPersistTaps="handled"
            listUnderlayColor="#F3F4F6"
            numberOfLines={1}
          />

          {!GOOGLE_PLACES_API_KEY && (
            <View style={styles.warningContainer}>
              <Text style={styles.warningText}>
                Google Places API key is not configured. Please add EXPO_PUBLIC_GOOGLE_PLACES_API_KEY
                to your .env file.
              </Text>
            </View>
          )}

          <View style={styles.instructions}>
            <Text style={styles.instructionsText}>
              Start typing to search for locations. Tap on a result to select it.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    paddingVertical: 8,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  closeButtonPlaceholder: {
    width: 60,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  content: {
    flex: 1,
    padding: 20,
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
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    maxHeight: 400,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  row: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
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
    marginTop: 16,
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
  instructions: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  instructionsText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});
