import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRecur } from '../shared/stores/recur';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';

const { width } = Dimensions.get('window');

export default function InsightsScreen({ navigation }: any) {
  const {
    familyMembers,
    fetchAllFamilyMembers,
    fetchAllAttendance,
    fetchAllPayments,
    loading,
  } = useRecur();

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [allAttendance, setAllAttendance] = useState<any[]>([]);
  const [allPayments, setAllPayments] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await fetchAllFamilyMembers();
    const attendance = await fetchAllAttendance();
    const payments = await fetchAllPayments();
    setAllAttendance(attendance);
    setAllPayments(payments);
  };

  const onRefresh = () => {
    loadData();
  };

  const getFilteredData = () => {
    if (selectedMemberId) {
      const member = familyMembers.find(m => m.id === selectedMemberId);
      return {
        attendance: allAttendance.filter(a => a.family_member_id === selectedMemberId),
        payments: allPayments.filter(p => p.family_member_id === selectedMemberId),
        members: [member],
      };
    }
    return {
      attendance: allAttendance,
      payments: allPayments,
      members: familyMembers,
    };
  };

  const getTotalSpent = () => {
    const { payments } = getFilteredData();
    return payments.reduce((sum, p) => sum + p.amount, 0);
  };

  const getAttendanceTrendData = () => {
    const { attendance } = getFilteredData();
    const last3Months = eachMonthOfInterval({
      start: subMonths(new Date(), 2),
      end: new Date(),
    });

    return last3Months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const count = attendance.filter(a => {
        const date = new Date(a.class_date);
        return date >= monthStart && date <= monthEnd;
      }).length;

      return {
        month: format(month, 'MMM'),
        count,
      };
    });
  };

  const getExpensesByMember = () => {
    if (selectedMemberId) {
      return [];
    }

    return familyMembers.map(member => {
      const memberPayments = allPayments.filter(p => p.family_member_id === member.id);
      const total = memberPayments.reduce((sum, p) => sum + p.amount, 0);
      return {
        name: member.name,
        avatar: member.avatar,
        amount: total,
      };
    }).filter(m => m.amount > 0);
  };

  const getMemberColors = () => {
    const colors = ['#4A90E2', '#50C878', '#FFB84D', '#FF6B6B', '#9B59B6', '#3498DB'];
    return colors;
  };

  const totalSpent = getTotalSpent();
  const trendData = getAttendanceTrendData();
  const expensesByMember = getExpensesByMember();
  const maxTrendValue = Math.max(...trendData.map(d => d.count), 1);
  const colors = getMemberColors();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Insights</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.sectionTitle}>Select Family Member</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.memberSelector}
          contentContainerStyle={styles.memberSelectorContent}
        >
          <TouchableOpacity
            style={[
              styles.memberChip,
              selectedMemberId === null && styles.memberChipSelected,
            ]}
            onPress={() => setSelectedMemberId(null)}
          >
            <Text
              style={[
                styles.memberChipText,
                selectedMemberId === null && styles.memberChipTextSelected,
              ]}
            >
              All Members
            </Text>
          </TouchableOpacity>
          {familyMembers.map((member, index) => (
            <TouchableOpacity
              key={member.id}
              style={[
                styles.memberChip,
                selectedMemberId === member.id && styles.memberChipSelected,
              ]}
              onPress={() => setSelectedMemberId(member.id)}
            >
              <Text style={styles.memberAvatar}>{member.avatar}</Text>
              <Text
                style={[
                  styles.memberChipText,
                  selectedMemberId === member.id && styles.memberChipTextSelected,
                ]}
              >
                {member.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Attendance Trend</Text>
          <View style={styles.barChart}>
            {trendData.map((item, index) => {
              const barHeight = maxTrendValue > 0 ? (item.count / maxTrendValue) * 120 : 0;
              return (
                <View key={index} style={styles.barContainer}>
                  <View style={styles.barWrapper}>
                    <View style={[styles.bar, { height: barHeight || 4 }]} />
                  </View>
                  <Text style={styles.barLabel}>{item.month}</Text>
                  <Text style={styles.barValue}>{item.count}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {expensesByMember.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Expenses by Family Member</Text>
            <View style={styles.expenseList}>
              {expensesByMember.map((member, index) => {
                const percentage = totalSpent > 0 ? (member.amount / totalSpent) * 100 : 0;
                return (
                  <View key={index} style={styles.expenseItem}>
                    <View style={styles.expenseHeader}>
                      <View style={styles.expenseMemberInfo}>
                        <Text style={styles.expenseAvatar}>{member.avatar}</Text>
                        <Text style={styles.expenseName}>{member.name}</Text>
                      </View>
                      <Text style={styles.expenseAmount}>${member.amount.toFixed(2)}</Text>
                    </View>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${percentage}%`,
                            backgroundColor: colors[index % colors.length],
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.expensePercentage}>{percentage.toFixed(1)}%</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {expensesByMember.length === 0 && selectedMemberId === null && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No payment data available</Text>
            <Text style={styles.emptySubtext}>
              Record payments to see expense distribution
            </Text>
          </View>
        )}
      </ScrollView>
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
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
  },
  content: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 12,
  },
  memberSelector: {
    marginBottom: 20,
  },
  memberSelectorContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  memberChipSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  memberAvatar: {
    fontSize: 18,
  },
  memberChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  memberChipTextSelected: {
    color: '#FFFFFF',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 20,
  },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 180,
    paddingTop: 20,
  },
  barContainer: {
    alignItems: 'center',
    flex: 1,
  },
  barWrapper: {
    height: 120,
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 8,
  },
  bar: {
    width: 40,
    backgroundColor: '#2563EB',
    borderRadius: 8,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  barValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 2,
  },
  expenseList: {
    gap: 20,
  },
  expenseItem: {
    gap: 8,
  },
  expenseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  expenseMemberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  expenseAvatar: {
    fontSize: 20,
  },
  expenseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  progressBar: {
    height: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  expensePercentage: {
    fontSize: 12,
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
