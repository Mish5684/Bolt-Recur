import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  RefreshControl,
  FlatList,
  SafeAreaView,
  Linking,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRecur } from '../shared/stores/recur';
import { ClassWithDetails } from '../shared/types/database';

export default function FamilyMemberDetailScreen({ route, navigation }: any) {
  const { memberId } = route.params;
  const { familyMembers, fetchFamilyMemberClasses, fetchAllFamilyMembers, fetchCostPerClassForMember, loading } = useRecur();
  const [memberClasses, setMemberClasses] = useState<ClassWithDetails[]>([]);
  const [costPerClassData, setCostPerClassData] = useState<{ [classId: string]: any }>({});

  const member = familyMembers.find((m) => m.id === memberId);

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [memberId])
  );

  const loadData = async () => {
    await fetchAllFamilyMembers();
    const classes = await fetchFamilyMemberClasses(memberId);
    setMemberClasses(classes);
    const costData = await fetchCostPerClassForMember(memberId);
    setCostPerClassData(costData);
  };

  const onRefresh = () => {
    loadData();
  };

  const getTotalSpent = () => {
    return Object.values(costPerClassData).reduce((sum, data) => sum + data.totalPaid, 0);
  };

  const getClassStats = (classId: string) => {
    const costData = costPerClassData[classId];
    if (costData) {
      return {
        attended: costData.classesAttended,
        remaining: costData.totalClassesPurchased - costData.classesAttended,
        pricePerClass: costData.costPerClass,
        currency: costData.currency,
      };
    }
    return {
      attended: 0,
      remaining: 0,
      pricePerClass: 0,
      currency: 'USD',
    };
  };

  const getNextClassDate = (classItem: ClassWithDetails) => {
    if (!classItem.schedule || classItem.schedule.length === 0) {
      return null;
    }

    const today = new Date();
    const currentDayIndex = today.getDay();
    const dayMap: { [key: string]: number } = {
      'Sun': 0,
      'Mon': 1,
      'Tue': 2,
      'Wed': 3,
      'Thu': 4,
      'Fri': 5,
      'Sat': 6,
    };

    let nextClass = null;
    let minDaysAway = 8;

    classItem.schedule.forEach((scheduleItem) => {
      const scheduleDayIndex = dayMap[scheduleItem.day];
      let daysAway = scheduleDayIndex - currentDayIndex;
      if (daysAway <= 0) {
        daysAway += 7;
      }

      if (daysAway < minDaysAway) {
        minDaysAway = daysAway;
        nextClass = `${scheduleItem.day} at ${formatTime(scheduleItem.time)}`;
      }
    });

    return nextClass;
  };

  const formatTime = (time24: string) => {
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours, 10);
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${period}`;
  };

  const openMap = (latitude: number, longitude: number, address?: string) => {
    const label = address || 'Class Location';
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${latitude},${longitude}`,
      android: `geo:0,0?q=${latitude},${longitude}(${label})`,
    });

    if (url) {
      Linking.openURL(url);
    }
  };

  const renderClassCard = ({ item }: { item: ClassWithDetails }) => {
    const stats = getClassStats(item.id);
    const nextClass = getNextClassDate(item);
    const hasCostData = stats.pricePerClass > 0;

    const getCurrencySymbol = (currency: string) => {
      const symbols: { [key: string]: string } = {
        'USD': '$',
        'INR': '₹',
        'EUR': '€',
        'GBP': '£',
      };
      return symbols[currency] || '$';
    };

    return (
      <Pressable
        style={({ pressed }) => [
          styles.classCard,
          pressed && styles.classCardPressed,
        ]}
        onPress={() =>
          navigation.navigate('ClassDetail', {
            memberId,
            classId: item.id,
          })
        }
      >
        <View style={styles.classHeader}>
          <View style={styles.classHeaderLeft}>
            <Text style={styles.className}>{item.name}</Text>
          </View>
          <View style={styles.classHeaderRight}>
            {hasCostData && (
              <View style={styles.priceBadge}>
                <Text style={styles.priceText}>
                  {getCurrencySymbol(stats.currency)}{stats.pricePerClass.toFixed(2)}/class
                </Text>
              </View>
            )}
            <Text style={styles.chevron}>›</Text>
          </View>
        </View>

        {item.type && <Text style={styles.classType}>{item.type}</Text>}
        {item.instructor && (
          <Text style={styles.instructor}>👨‍🏫 {item.instructor}</Text>
        )}

        {item.latitude && item.longitude && (
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              openMap(item.latitude!, item.longitude!, item.address);
            }}
          >
            <Text style={styles.locationLink}>📍 Get Directions</Text>
          </TouchableOpacity>
        )}

        {nextClass && (
          <View style={styles.nextClassContainer}>
            <Text style={styles.nextClassLabel}>📅 Next class: {nextClass}</Text>
          </View>
        )}

        <View style={styles.classStats}>
          <Text style={styles.statText}>✓ {stats.attended} attended</Text>
          <Text style={styles.statText}>{stats.remaining} remaining</Text>
        </View>

        {!hasCostData && (
          <Text style={styles.noPaymentText}>No payments recorded</Text>
        )}

        <Text style={styles.tapHint}>Tap to mark attendance or record payment</Text>
      </Pressable>
    );
  };

  if (!member) {
    return (
      <View style={styles.container}>
        <Text>Member not found</Text>
      </View>
    );
  }

  const totalSpent = getTotalSpent();
  const classCount = memberClasses.length;

  const renderHeader = () => (
    <>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{member.avatar}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{member.name}</Text>
          <Text style={styles.profileRelation}>{member.relation}</Text>
          <View style={styles.profileStats}>
            <View style={styles.profileBadge}>
              <Text style={styles.profileBadgeText}>{classCount} Classes</Text>
            </View>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.addClassButton}
        onPress={() =>
          navigation.navigate('AddClass', { memberId: member.id })
        }
      >
        <Text style={styles.addClassText}>+ Add Class</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Classes</Text>
    </>
  );

  const renderEmptyComponent = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyText}>No classes yet</Text>
      <Text style={styles.emptySubtext}>
        Add a class to start tracking attendance
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.title}>{member.name}</Text>
          <Text style={styles.subtitle}>{member.relation}</Text>
        </View>
      </View>

      <FlatList
        data={memberClasses}
        renderItem={renderClassCard}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyComponent}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} />
        }
      />
    </SafeAreaView>
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    marginRight: 12,
  },
  backText: {
    fontSize: 32,
    fontWeight: '300',
    color: '#1F2937',
  },
  headerTitle: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  listContent: {
    paddingBottom: 100,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    margin: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 40,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  profileRelation: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  profileStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileBadge: {
    backgroundColor: '#1F2937',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  profileBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  profileSpent: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  addClassButton: {
    marginHorizontal: 20,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  addClassText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  classCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  classCardPressed: {
    backgroundColor: '#F9FAFB',
    borderColor: '#D1D5DB',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
    transform: [{ scale: 0.98 }],
  },
  classHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  classHeaderLeft: {
    flex: 1,
  },
  classHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  className: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  chevron: {
    fontSize: 28,
    color: '#D1D5DB',
    fontWeight: '300',
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
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  instructor: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  locationLink: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '500',
    textDecorationLine: 'underline',
    marginBottom: 12,
  },
  nextClassContainer: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  nextClassLabel: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '500',
  },
  classStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  statText: {
    fontSize: 13,
    color: '#6B7280',
  },
  noPaymentText: {
    fontSize: 12,
    color: '#F59E0B',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  tapHint: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  emptyState: {
    paddingHorizontal: 20,
    paddingVertical: 40,
    alignItems: 'center',
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
