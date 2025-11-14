import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  RefreshControl,
  FlatList,
  Modal,
  Alert,
  Platform,
  SafeAreaView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRecur } from '../shared/stores/recur';
import { ClassAttendance, Payment } from '../shared/types/database';
import { format } from 'date-fns';
import AttendanceCalendar from '../components/AttendanceCalendar';
import LocationDisplay from '../components/LocationDisplay';

export default function ClassDetailScreen({ route, navigation }: any) {
  const { memberId, classId } = route.params;
  const {
    classes,
    fetchClasses,
    fetchAttendanceForClass,
    fetchPaymentsForClass,
    addAttendance,
    deleteAttendance,
    deletePayment,
    deleteClass,
    loading,
  } = useRecur();
  const [attendance, setAttendance] = useState<ClassAttendance[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const classData = classes.find((c) => c.id === classId);

  useEffect(() => {
    loadData();
  }, [memberId, classId]);

  const loadData = async () => {
    await fetchClasses();
    const attendanceData = await fetchAttendanceForClass(memberId, classId);
    const paymentsData = await fetchPaymentsForClass(memberId, classId);
    setAttendance(attendanceData);
    setPayments(paymentsData);
  };

  const onRefresh = () => {
    loadData();
  };

  const handleMarkAttendance = () => {
    setShowDatePicker(true);
  };

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (date) {
      setSelectedDate(date);
      if (Platform.OS === 'android') {
        confirmAttendance(date);
      }
    }
  };

  const confirmAttendance = async (date: Date) => {
    setShowDatePicker(false);
    await addAttendance({
      family_member_id: memberId,
      class_id: classId,
      class_date: format(date, 'yyyy-MM-dd'),
    });
    await loadData();
  };

  const handleDeleteAttendance = async (attendanceId: string) => {
    const success = await deleteAttendance(attendanceId);
    if (success) {
      await loadData();
    }
  };

  const handleRecordPayment = () => {
    navigation.navigate('RecordPayment', { memberId, classId });
  };

  const handleEditClass = () => {
    navigation.navigate('EditClass', { classId });
  };

  const handleDeleteClass = () => {
    Alert.alert(
      'Delete Class',
      'Are you sure you want to delete this class? This will permanently delete all attendance records and payments associated with this class.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteClass(classId);
            if (success) {
              navigation.goBack();
            }
          },
        },
      ]
    );
  };

  const formatSchedule = () => {
    if (!classData?.schedule || classData.schedule.length === 0) {
      return 'No schedule set';
    }
    return classData.schedule.map(s => `${s.day} ${s.time}`).join(', ');
  };

  const totalPaid = payments.reduce((sum, p) => sum + p.classes_paid, 0);
  const totalSpent = payments.reduce((sum, p) => sum + p.amount, 0);
  const attended = attendance.length;
  const remaining = totalPaid - attended;

  const primaryCurrency = payments.length > 0 ? payments[0].currency : 'USD';

  const handleEditPayment = (payment: Payment) => {
    navigation.navigate('RecordPayment', {
      memberId,
      classId,
      paymentId: payment.id,
      paymentData: payment,
    });
  };

  const handleDeletePayment = (paymentId: string) => {
    Alert.alert(
      'Delete Payment',
      'Are you sure you want to delete this payment record?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deletePayment(paymentId);
            if (success) {
              await loadData();
            }
          },
        },
      ]
    );
  };

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const renderPayment = ({ item }: { item: Payment }) => {
    const isMenuVisible = openMenuId === item.id;

    return (
      <View style={styles.paymentItem}>
        <View style={styles.paymentDate}>
          <Text style={styles.paymentDateText}>
            {format(new Date(item.payment_date), 'MMM d, yyyy')}
          </Text>
          <Text style={styles.paymentClasses}>{item.classes_paid} classes</Text>
        </View>
        <Text style={styles.paymentAmount}>
          {item.currency} {item.amount.toFixed(2)}
        </Text>
        <View style={styles.paymentActionsContainer}>
          <TouchableOpacity
            onPress={() => setOpenMenuId(item.id)}
            style={styles.menuButton}
          >
            <Text style={styles.menuButtonText}>⋮</Text>
          </TouchableOpacity>
        </View>

        <Modal
          transparent
          visible={isMenuVisible}
          animationType="fade"
          onRequestClose={() => setOpenMenuId(null)}
        >
          <TouchableOpacity
            style={styles.paymentModalOverlay}
            activeOpacity={1}
            onPress={() => setOpenMenuId(null)}
          >
            <View style={styles.paymentMenuContainer}>
              <TouchableOpacity
                style={styles.paymentMenuItem}
                onPress={() => {
                  setOpenMenuId(null);
                  handleEditPayment(item);
                }}
              >
                <Text style={styles.paymentMenuItemText}>Edit</Text>
              </TouchableOpacity>
              <View style={styles.paymentMenuDivider} />
              <TouchableOpacity
                style={styles.paymentMenuItem}
                onPress={() => {
                  setOpenMenuId(null);
                  handleDeletePayment(item.id);
                }}
              >
                <Text style={[styles.paymentMenuItemText, styles.paymentMenuItemTextDanger]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  };

  if (!classData) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Class not found</Text>
      </SafeAreaView>
    );
  }

  const combinedData = [
    { type: 'header' },
    { type: 'attendanceCalendar' },
    { type: 'paymentHeader' },
    ...payments.map(item => ({ type: 'payment', data: item })),
    { type: 'deleteButton' },
  ];

  const renderItem = ({ item }: any) => {
    if (item.type === 'header') {
      return (
        <>
          <View style={styles.classHeader}>
            <View style={styles.classNameContainer}>
              <Text style={styles.className}>{classData.name}</Text>
              <TouchableOpacity onPress={handleEditClass} style={styles.editButton}>
                <Text style={styles.editIcon}>✏️</Text>
              </TouchableOpacity>
            </View>
          </View>

          {classData.type && <Text style={styles.classType}>{classData.type}</Text>}

          <View style={styles.infoRow}>
            <Text style={styles.instructor}>
              👨‍🏫 {classData.instructor || 'No instructor assigned'}
            </Text>
            <TouchableOpacity onPress={handleEditClass}>
              <Text style={styles.editIconSmall}>✏️</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.schedule}>
              📅 {formatSchedule()}
            </Text>
            <TouchableOpacity onPress={handleEditClass}>
              <Text style={styles.editIconSmall}>✏️</Text>
            </TouchableOpacity>
          </View>

          {classData.latitude && classData.longitude && (
            <LocationDisplay
              location={{
                location_name: classData.location_name,
                address: classData.address,
                latitude: classData.latitude,
                longitude: classData.longitude,
                pincode: classData.pincode,
                city: classData.city,
                country: classData.country,
                place_id: classData.place_id,
              }}
              showMap={true}
              showDirectionsButton={true}
            />
          )}

          <View style={styles.actionButtons}>
            <Pressable
              style={({ pressed }) => [
                styles.ctaButton,
                pressed && styles.ctaButtonPressed,
              ]}
              onPress={handleMarkAttendance}
            >
              <Text style={styles.ctaButtonText}>✓ Mark Attendance</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.ctaButton,
                pressed && styles.ctaButtonPressed,
              ]}
              onPress={handleRecordPayment}
            >
              <Text style={styles.ctaButtonText}>$ Record Payment</Text>
            </Pressable>
          </View>

          <View style={styles.infoTilesContainer}>
            <View style={styles.infoTilesRow}>
              <View style={styles.infoTile}>
                <Text style={styles.infoTileLabel}>Total Attended</Text>
                <Text
                  style={styles.infoTileValue}
                  adjustsFontSizeToFit
                  numberOfLines={1}
                  minimumFontScale={0.6}
                >
                  {attended}
                </Text>
              </View>
              <View style={styles.infoTile}>
                <Text style={styles.infoTileLabel}>Attended This Month</Text>
                <Text
                  style={styles.infoTileValue}
                  adjustsFontSizeToFit
                  numberOfLines={1}
                  minimumFontScale={0.6}
                >
                  {attendance.filter(a => {
                    const date = new Date(a.class_date);
                    const now = new Date();
                    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                  }).length}
                </Text>
              </View>
            </View>
            <View style={styles.infoTilesRow}>
              <View style={styles.infoTile}>
                <Text style={styles.infoTileLabel}>Prepaid Classes Remaining</Text>
                <Text
                  style={[styles.infoTileValue, remaining <= 0 && styles.warningText]}
                  adjustsFontSizeToFit
                  numberOfLines={1}
                  minimumFontScale={0.6}
                >
                  {remaining}
                </Text>
              </View>
              <View style={styles.infoTile}>
                <Text style={styles.infoTileLabel}>Total Spent</Text>
                <Text
                  style={styles.infoTileValue}
                  adjustsFontSizeToFit
                  numberOfLines={1}
                  minimumFontScale={0.5}
                >
                  {primaryCurrency} {totalSpent.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Attendance</Text>
        </>
      );
    }

    if (item.type === 'attendanceCalendar') {
      return (
        <>
          {attendance.length === 0 ? (
            <Text style={styles.emptyText}>No attendance records yet</Text>
          ) : (
            <AttendanceCalendar
              attendance={attendance}
              onDeleteAttendance={handleDeleteAttendance}
            />
          )}
        </>
      );
    }

    if (item.type === 'paymentHeader') {
      return (
        <>
          <Text style={styles.sectionTitle}>Payment History</Text>
          {payments.length === 0 && (
            <Text style={styles.emptyText}>No payment records yet</Text>
          )}
        </>
      );
    }

    if (item.type === 'payment') {
      return renderPayment({ item: item.data });
    }

    if (item.type === 'deleteButton') {
      return (
        <TouchableOpacity
          style={styles.deleteClassButton}
          onPress={handleDeleteClass}
        >
          <Text style={styles.deleteClassText}>🗑️ Delete Class</Text>
        </TouchableOpacity>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={combinedData}
        renderItem={renderItem}
        keyExtractor={(item, index) => `${item.type}-${index}`}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} />
        }
        nestedScrollEnabled={true}
      />

      {showDatePicker && (
        <Modal
          visible={showDatePicker}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Attendance Date</Text>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                maximumDate={new Date()}
              />
              {Platform.OS === 'ios' && (
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(false)}
                    style={styles.modalCancelButton}
                  >
                    <Text style={styles.modalCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => confirmAttendance(selectedDate)}
                    style={styles.modalConfirmButton}
                  >
                    <Text style={styles.modalConfirmText}>Confirm</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  backText: {
    fontSize: 32,
    fontWeight: '300',
    color: '#1F2937',
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  classHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  className: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
  },
  priceBadge: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  priceText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  classType: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 4,
  },
  instructor: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 4,
  },
  schedule: {
    fontSize: 15,
    color: '#6B7280',
    flex: 1,
  },
  classNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  editButton: {
    padding: 4,
  },
  editIcon: {
    fontSize: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  editIconSmall: {
    fontSize: 16,
    padding: 4,
  },
  deleteClassButton: {
    marginTop: 32,
    marginBottom: 40,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EF4444',
    alignItems: 'center',
  },
  deleteClassText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  infoTilesContainer: {
    marginBottom: 20,
  },
  infoTilesRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  infoTile: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoTileLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 6,
    textAlign: 'center',
  },
  infoTileValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  warningText: {
    color: '#EF4444',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    marginTop: 12,
  },
  ctaButton: {
    flex: 1,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  ctaButtonPressed: {
    backgroundColor: '#1E40AF',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
    transform: [{ scale: 0.98 }],
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
    marginTop: 16,
  },
  totalSpentText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
    marginTop: -8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#1F2937',
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  paymentList: {
    marginBottom: 32,
  },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 6,
  },
  paymentDate: {
    flex: 1,
  },
  paymentDateText: {
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '600',
    marginBottom: 2,
  },
  paymentClasses: {
    fontSize: 13,
    color: '#6B7280',
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  paymentActionsContainer: {
    marginLeft: 12,
  },
  menuButton: {
    padding: 8,
    minWidth: 32,
    alignItems: 'center',
  },
  menuButtonText: {
    fontSize: 24,
    color: '#6B7280',
    fontWeight: '600',
  },
  paymentModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentMenuContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  paymentMenuItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  paymentMenuItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
  },
  paymentMenuItemTextDanger: {
    color: '#DC2626',
  },
  paymentMenuDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginBottom: 16,
  },
});
