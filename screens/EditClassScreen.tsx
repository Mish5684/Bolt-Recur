import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  FlatList,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { useRecur } from '../shared/stores/recur';
import { ScheduleItem, LocationData } from '../shared/types/database';
import LocationSearch from '../components/LocationSearch';
import KeyboardToolbar from '../components/KeyboardToolbar';

const CLASS_TYPES = [
  'Academic',
  'Music',
  'Dance',
  'Sports',
  'Martial Arts',
  'Art & Craft',
  'Language',
  'Fitness',
  'Technology',
  'Other',
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 8; hour <= 22; hour++) {
    for (let min = 0; min < 60; min += 30) {
      const time = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      const displayTime = `${displayHour}:${min.toString().padStart(2, '0')} ${period}`;
      slots.push({ value: time, label: displayTime });
    }
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

export default function EditClassScreen({ route, navigation }: any) {
  const { classId } = route.params;
  const { classes, updateClass, loading } = useRecur();

  const classData = classes.find((c) => c.id === classId);

  const [className, setClassName] = useState('');
  const [classType, setClassType] = useState('');
  const [instructor, setInstructor] = useState('');
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [location, setLocation] = useState<LocationData | null>(null);

  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showDayModal, setShowDayModal] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [currentDay, setCurrentDay] = useState('');

  useEffect(() => {
    if (classData) {
      setClassName(classData.name);
      setClassType(classData.type || '');
      setInstructor(classData.instructor || '');
      setSchedule(classData.schedule || []);
      if (classData.latitude && classData.longitude) {
        setLocation({
          location_name: classData.location_name,
          address: classData.address,
          latitude: classData.latitude,
          longitude: classData.longitude,
          pincode: classData.pincode,
          city: classData.city,
          country: classData.country,
          place_id: classData.place_id,
        });
      }
    }
  }, [classData]);

  const handleAddSchedule = (day: string) => {
    setCurrentDay(day);
    setShowDayModal(false);
    setShowTimeModal(true);
  };

  const handleAddTime = (time: string) => {
    if (currentDay) {
      const newScheduleItem = { day: currentDay, time };
      const exists = schedule.some(s => s.day === currentDay && s.time === time);
      if (!exists) {
        setSchedule([...schedule, newScheduleItem]);
      }
    }
    setShowTimeModal(false);
    setCurrentDay('');
  };

  const handleRemoveSchedule = (index: number) => {
    setSchedule(schedule.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!className.trim()) {
      alert('Please enter a class name');
      return;
    }

    const updateData: any = {
      name: className.trim(),
      type: classType || null,
      instructor: instructor.trim() || null,
      schedule: schedule.length > 0 ? schedule : null,
      location_name: location?.location_name || null,
      address: location?.address || null,
      latitude: location?.latitude || null,
      longitude: location?.longitude || null,
      pincode: location?.pincode || null,
      city: location?.city || null,
      country: location?.country || null,
      place_id: location?.place_id || null,
    };

    const success = await updateClass(classId, updateData);
    if (success) {
      navigation.goBack();
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  if (!classData) {
    return (
      <View style={styles.container}>
        <Text>Class not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
          <Text style={styles.backText}>‹ Edit Class</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 20 }} keyboardShouldPersistTaps="handled" nestedScrollEnabled={true}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.form}>
            <Text style={styles.label}>Class Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Piano Lessons, Yoga, Swimming"
              placeholderTextColor="#9CA3AF"
              value={className}
              onChangeText={setClassName}
              editable={!loading}
              returnKeyType="next"
            />

            <Text style={styles.label}>Class Type</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => {
                Keyboard.dismiss();
                setShowTypeModal(true);
              }}
              disabled={loading}
            >
              <Text style={classType ? styles.inputText : styles.placeholderText}>
                {classType || 'Select class type'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.label}>Instructor</Text>
            <TextInput
              style={styles.input}
              placeholder="Instructor name"
              placeholderTextColor="#9CA3AF"
              value={instructor}
              onChangeText={setInstructor}
              editable={!loading}
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
            />

            <Text style={styles.label}>Schedule</Text>
            <TouchableOpacity
              style={styles.scheduleButton}
              onPress={() => {
                Keyboard.dismiss();
                setShowDayModal(true);
              }}
              disabled={loading}
            >
              <Text style={styles.scheduleButtonText}>+ Add Day/Time</Text>
            </TouchableOpacity>

            {schedule.length > 0 && (
              <View style={styles.scheduleList}>
                {schedule.map((item, index) => (
                  <View key={index} style={styles.scheduleChip}>
                    <Text style={styles.scheduleChipText}>{item.day} {item.time}</Text>
                    <TouchableOpacity onPress={() => handleRemoveSchedule(index)}>
                      <Text style={styles.scheduleChipRemove}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <Text style={styles.label}>Location</Text>
            <View style={styles.locationSearchContainer}>
              <LocationSearch
                onLocationSelect={(locationData) => setLocation(locationData)}
                placeholder="Search for class location (e.g., Artstation Khar)"
                disabled={loading}
              />
            </View>
            {location && (
              <View style={styles.locationSelectedContainer}>
                <Text style={styles.locationSelectedIcon}>📍</Text>
                <View style={styles.locationSelectedInfo}>
                  <Text style={styles.locationSelectedName}>{location.location_name}</Text>
                  {location.address && (
                    <Text style={styles.locationSelectedAddress} numberOfLines={2}>
                      {location.address}
                    </Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => setLocation(null)} style={styles.locationRemoveButton}>
                  <Text style={styles.locationRemoveText}>×</Text>
                </TouchableOpacity>
              </View>
            )}
            </View>
          </TouchableWithoutFeedback>
        </ScrollView>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={loading || !className.trim()}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancel}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showTypeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Class Type</Text>
            <FlatList
              data={CLASS_TYPES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setClassType(item);
                    setShowTypeModal(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowTypeModal(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showDayModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Day</Text>
            <FlatList
              data={DAYS}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => handleAddSchedule(item)}
                >
                  <Text style={styles.modalItemText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowDayModal(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showTimeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Time for {currentDay}</Text>
            <FlatList
              data={TIME_SLOTS}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => handleAddTime(item.value)}
                >
                  <Text style={styles.modalItemText}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => {
                setShowTimeModal(false);
                setCurrentDay('');
              }}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <KeyboardToolbar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
  },
  inputText: {
    fontSize: 16,
    color: '#1F2937',
  },
  placeholderText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flexColumn: {
    flex: 1,
  },
  scheduleButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
  },
  scheduleButtonText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  scheduleList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  scheduleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 8,
  },
  scheduleChipText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  scheduleChipRemove: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  footer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  saveButton: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalItemText: {
    fontSize: 16,
    color: '#1F2937',
  },
  modalCloseButton: {
    marginTop: 16,
    paddingVertical: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
  },
  locationSearchContainer: {
    minHeight: 60,
    marginBottom: 12,
  },
  locationSelectedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  locationSelectedIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  locationSelectedInfo: {
    flex: 1,
  },
  locationSelectedName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  locationSelectedAddress: {
    fontSize: 13,
    color: '#6B7280',
  },
  locationRemoveButton: {
    padding: 4,
    marginLeft: 8,
  },
  locationRemoveText: {
    fontSize: 24,
    color: '#6B7280',
    fontWeight: '600',
  },
});
