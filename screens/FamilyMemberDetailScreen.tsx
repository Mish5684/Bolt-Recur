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
  const { familyMembers, fetchFamilyMemberClasses, fetchAllFamilyMembers, fetchCostPerClassForMember, resumeClass, loading } = useRecur();
  const [memberClasses, setMemberClasses] = useState<ClassWithDetails[]>([]);
  const [costPerClassData, setCostPerClassData] = useState<{ [classId: string]: any }>({});
  const [pausedSectionExpanded, setPausedSectionExpanded] = useState(false);

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

  const handleResumeClass = async (classId: string) => {
    const success = await resumeClass(classId);
    if (success) {
      await loadData();
    }
  };

  const renderClassCard = ({ item, isPaused }: { item: ClassWithDetails; isPaused?: boolean }) => {
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

    const getDaysSincePaused = () => {
      if (!item.paused_at) return 0;
      const pausedDate = new Date(item.paused_at);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - pausedDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    };

    return (
      <Pressable
        style={({ pressed }) => [
          styles.classCard,
          isPaused && styles.classCardPaused,
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
            {isPaused && <Text style={styles.pauseIcon}>⏸️ </Text>}
            <Text style={[styles.className, isPaused && styles.classNamePaused]}>{item.name}</Text>
          </View>
          <View style={styles.classHeaderRight}>
            {hasCostData && !isPaused && (
              <View style={styles.priceBadge}>
                <Text style={styles.priceText}>
                  {getCurrencySymbol(stats.currency)}{stats.pricePerClass.toFixed(2)}/class
                </Text>
              </View>
            )}
            {!isPaused && <Text style={styles.chevron}>›</Text>}
          </View>
        </View>

        {isPaused ? (
          <>
            <Text style={styles.pausedText}>
              Paused {getDaysSincePaused()} day{getDaysSincePaused() !== 1 ? 's' : ''} ago
            </Text>
            {item.paused_reason && (
              <Text style={styles.pausedReason}>Reason: {item.paused_reason}</Text>
            )}
            <TouchableOpacity
              style={styles.resumeButtonSmall}
              onPress={(e) => {
                e.stopPropagation();
                handleResumeClass(item.id);
              }}
            >
              <Text style={styles.resumeButtonSmallText}>Resume</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {nextClass && (
              <Text style={styles.nextClassText}>📅 Next: {nextClass}</Text>
            )}
            <Text style={styles.remainingText}>{stats.remaining} classes remaining</Text>
          </>
        )}
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
  const activeClasses = memberClasses.filter(c => c.status === 'active');
  const pausedClasses = memberClasses.filter(c => c.status === 'paused');
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

      {activeClasses.length > 0 && (
        <Text style={styles.sectionTitle}>Active Classes ({activeClasses.length})</Text>
      )}
    </>
  );

  const renderPausedSection = () => {
    if (pausedClasses.length === 0) return null;

    return (
      <View style={styles.pausedSection}>
        <TouchableOpacity
          style={styles.pausedSectionHeader}
          onPress={() => setPausedSectionExpanded(!pausedSectionExpanded)}
        >
          <Text style={styles.pausedSectionTitle}>
            Paused Classes ({pausedClasses.length})
          </Text>
          <Text style={styles.pausedSectionChevron}>
            {pausedSectionExpanded ? '▼' : '▶'}
          </Text>
        </TouchableOpacity>
        {pausedSectionExpanded && pausedClasses.map((classItem) => (
          <View key={classItem.id}>
            {renderClassCard({ item: classItem, isPaused: true })}
          </View>
        ))}
      </View>
    );
  };

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
        data={activeClasses}
        renderItem={({ item }) => renderClassCard({ item })}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderPausedSection}
        ListEmptyComponent={activeClasses.length === 0 && pausedClasses.length === 0 ? renderEmptyComponent : null}
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
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  classCardPressed: {
    backgroundColor: '#F3F4F6',
  },
  classHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
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
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  chevron: {
    fontSize: 24,
    color: '#9CA3AF',
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
  nextClassText: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  remainingText: {
    fontSize: 13,
    color: '#6B7280',
  },
  classCardPaused: {
    opacity: 0.7,
    backgroundColor: '#F9FAFB',
  },
  classHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pauseIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  classNamePaused: {
    color: '#6B7280',
  },
  pausedText: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  pausedReason: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  resumeButtonSmall: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  resumeButtonSmallText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  pausedSection: {
    marginTop: 24,
    paddingBottom: 20,
  },
  pausedSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
  },
  pausedSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  pausedSectionChevron: {
    fontSize: 14,
    color: '#6B7280',
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
