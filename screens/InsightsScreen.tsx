import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRecur } from '../shared/stores/recur';
import { format, eachMonthOfInterval, subMonths, isSameMonth, isSameYear, eachWeekOfInterval, subWeeks, startOfWeek, endOfWeek } from 'date-fns';
import { FamilyMember, ClassAttendance, Payment, ClassWithDetails } from '../shared/types/database';

interface MemberOption {
  id: string | null;
  label: string;
  avatar?: string;
}

export default function InsightsScreen({ navigation }: any) {
  const {
    familyMembers,
    fetchAllFamilyMembers,
    fetchAllAttendance,
    fetchAllPayments,
    fetchFamilyMemberClasses,
    loading,
  } = useRecur();

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [allAttendance, setAllAttendance] = useState<ClassAttendance[]>([]);
  const [allPayments, setAllPayments] = useState<Payment[]>([]);
  const [memberClasses, setMemberClasses] = useState<ClassWithDetails[]>([]);
  const [selectorVisible, setSelectorVisible] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedMemberId) {
      loadMemberClasses();
    } else {
      setMemberClasses([]);
    }
  }, [selectedMemberId]);

  const loadData = async () => {
    await fetchAllFamilyMembers();
    const attendance = await fetchAllAttendance();
    const payments = await fetchAllPayments();
    setAllAttendance(attendance);
    setAllPayments(payments);
  };

  const loadMemberClasses = async () => {
    if (selectedMemberId) {
      const classes = await fetchFamilyMemberClasses(selectedMemberId);
      setMemberClasses(classes);
    }
  };

  const onRefresh = () => {
    loadData();
  };

  const memberOptions: MemberOption[] = [
    { id: null, label: 'All Family' },
    ...familyMembers.map(m => ({ id: m.id, label: m.name, avatar: m.avatar })),
  ];

  const selectedOption = memberOptions.find(o => o.id === selectedMemberId) || memberOptions[0];

  const getFilteredData = () => {
    if (selectedMemberId) {
      return {
        attendance: allAttendance.filter(a => a.family_member_id === selectedMemberId),
        payments: allPayments.filter(p => p.family_member_id === selectedMemberId),
      };
    }
    return {
      attendance: allAttendance,
      payments: allPayments,
    };
  };

  const { attendance, payments } = getFilteredData();

  // Get the most common currency from payments
  const getCurrency = () => {
    if (payments.length === 0) return '$';
    const currencies = payments.map(p => p.currency || 'USD');
    const currencyCount = currencies.reduce((acc, curr) => {
      acc[curr] = (acc[curr] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const mostCommon = Object.keys(currencyCount).reduce((a, b) =>
      currencyCount[a] > currencyCount[b] ? a : b
    );
    // Map currency codes to symbols
    const currencySymbols: Record<string, string> = {
      'USD': '$',
      'INR': '₹',
      'EUR': '€',
      'GBP': '£',
    };
    return currencySymbols[mostCommon] || mostCommon;
  };

  const currency = getCurrency();

  // Spending Calculations
  const getThisMonthSpending = () => {
    return payments
      .filter(p => isSameMonth(new Date(p.payment_date), new Date()))
      .reduce((sum, p) => sum + p.amount, 0);
  };

  const getThisYearSpending = () => {
    return payments
      .filter(p => isSameYear(new Date(p.payment_date), new Date()))
      .reduce((sum, p) => sum + p.amount, 0);
  };

  const getSpendingTrend = () => {
    const months = eachMonthOfInterval({
      start: subMonths(new Date(), 5),
      end: new Date(),
    });

    return months.map(month => ({
      month: format(month, 'MMM'),
      amount: payments
        .filter(p => isSameMonth(new Date(p.payment_date), month))
        .reduce((sum, p) => sum + p.amount, 0),
    }));
  };

  const getMemberSpendingBreakdown = () => {
    if (selectedMemberId) return [];

    const thisYearTotal = getThisYearSpending();

    return familyMembers
      .map(member => {
        const memberPayments = allPayments.filter(
          p => p.family_member_id === member.id && isSameYear(new Date(p.payment_date), new Date())
        );
        const total = memberPayments.reduce((sum, p) => sum + p.amount, 0);
        const percentage = thisYearTotal > 0 ? (total / thisYearTotal) * 100 : 0;

        return {
          member,
          amount: total,
          percentage,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  };

  // Attendance Calculations
  const getAttendanceTrend = () => {
    const weeks = eachWeekOfInterval({
      start: subWeeks(new Date(), 7),
      end: new Date(),
    }, { weekStartsOn: 0 }); // Start week on Sunday

    return weeks.map((week, index) => {
      const weekStart = startOfWeek(week, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(week, { weekStartsOn: 0 });

      return {
        week: format(weekStart, 'M/d'),
        count: attendance.filter(a => {
          const classDate = new Date(a.class_date);
          return classDate >= weekStart && classDate <= weekEnd;
        }).length,
        showLabel: index % 2 === 0, // Show label for every other week
      };
    });
  };

  const getClassAttendanceTrend = (classId: string) => {
    const weeks = eachWeekOfInterval({
      start: subWeeks(new Date(), 7),
      end: new Date(),
    }, { weekStartsOn: 0 }); // Start week on Sunday

    return weeks.map((week, index) => {
      const weekStart = startOfWeek(week, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(week, { weekStartsOn: 0 });

      return {
        week: format(weekStart, 'M/d'),
        count: attendance.filter(a => {
          const classDate = new Date(a.class_date);
          return a.class_id === classId && classDate >= weekStart && classDate <= weekEnd;
        }).length,
        showLabel: index % 2 === 0, // Show label for every other week
      };
    });
  };

  const getMemberAttendanceBreakdown = () => {
    if (selectedMemberId) return [];

    return familyMembers.map(member => {
      const memberAttendance = allAttendance.filter(a => a.family_member_id === member.id);
      const months = eachMonthOfInterval({
        start: subMonths(new Date(), 5),
        end: new Date(),
      });

      const trend = months.map(month => ({
        month: format(month, 'MMM'),
        count: memberAttendance.filter(a => isSameMonth(new Date(a.class_date), month)).length,
      }));

      return {
        member,
        trend,
        totalCount: memberAttendance.length,
      };
    }).sort((a, b) => b.totalCount - a.totalCount);
  };

  const thisMonthSpending = getThisMonthSpending();
  const thisYearSpending = getThisYearSpending();
  const spendingTrend = getSpendingTrend();
  const attendanceTrend = getAttendanceTrend();
  const memberSpendingBreakdown = getMemberSpendingBreakdown();
  const memberAttendanceBreakdown = getMemberAttendanceBreakdown();

  const maxSpending = Math.max(...spendingTrend.map(d => d.amount), 1);
  const maxAttendance = Math.max(...attendanceTrend.map(d => d.count), 1);

  const hasPayments = payments.length > 0;
  const hasAttendance = attendance.length > 0;

  const handleAddPayment = () => {
    if (selectedMemberId) {
      navigation.navigate('FamilyMemberDetail', { memberId: selectedMemberId });
    }
  };

  const handleAddAttendance = () => {
    if (selectedMemberId) {
      navigation.navigate('FamilyMemberDetail', { memberId: selectedMemberId });
    }
  };

  const handleAddAttendanceForClass = (memberId: string, classId: string) => {
    navigation.navigate('ClassDetail', { memberId, classId });
  };

  const handleMemberPaymentAdd = (memberId: string) => {
    navigation.navigate('FamilyMemberDetail', { memberId });
  };

  const handleMemberAttendanceAdd = (memberId: string) => {
    navigation.navigate('FamilyMemberDetail', { memberId });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Insights</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
      >
        {/* Dropdown Selector */}
        <View style={styles.selectorSection}>
          <Text style={styles.selectorLabel}>Select Family Member</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setSelectorVisible(true)}
          >
            <View style={styles.dropdownContent}>
              {selectedOption.avatar && (
                <Text style={styles.dropdownAvatar}>{selectedOption.avatar}</Text>
              )}
              <Text style={styles.dropdownText}>{selectedOption.label}</Text>
            </View>
            <Text style={styles.dropdownIcon}>▼</Text>
          </TouchableOpacity>
        </View>

        {/* Spending Insights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SPENDING INSIGHTS</Text>

          {hasPayments ? (
            <>
              {/* Individual View */}
              {selectedMemberId ? (
                <>
                  <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                      <Text style={styles.statLabel}>This Month</Text>
                      <Text style={styles.statValue}>{currency}{thisMonthSpending.toFixed(0)}</Text>
                    </View>
                    <View style={styles.statCard}>
                      <Text style={styles.statLabel}>This Year</Text>
                      <Text style={styles.statValue}>{currency}{thisYearSpending.toFixed(0)}</Text>
                    </View>
                  </View>

                  <View style={styles.chartCard}>
                    <Text style={styles.chartTitle}>Monthly Spending (Last 6 Months)</Text>
                    <View style={styles.chartContainer}>
                      <View style={styles.yAxisLabels}>
                        <Text style={styles.yAxisLabel}>{currency}{maxSpending.toFixed(0)}</Text>
                        <Text style={styles.yAxisLabel}>{currency}{(maxSpending * 0.5).toFixed(0)}</Text>
                        <Text style={styles.yAxisLabel}>0</Text>
                      </View>
                      <View style={styles.barChart}>
                        {spendingTrend.map((item, index) => {
                          const barHeight = maxSpending > 0 ? (item.amount / maxSpending) * 80 : 4;
                          return (
                            <View key={index} style={styles.barContainer}>
                              <View style={styles.barWrapper}>
                                <View style={[styles.bar, { height: barHeight || 4 }]} />
                              </View>
                              <Text style={styles.barLabel}>{item.month}</Text>
                              <Text style={styles.barValue}>{currency}{item.amount.toFixed(0)}</Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.memberActionButton}
                      onPress={handleAddPayment}
                    >
                      <Text style={styles.memberActionButtonText}>
                        Add any missing payments for {selectedOption.label}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                /* Family View */
                <>
                  <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                      <Text style={styles.statLabel}>This Month</Text>
                      <Text style={styles.statValue}>{currency}{thisMonthSpending.toFixed(0)}</Text>
                    </View>
                    <View style={styles.statCard}>
                      <Text style={styles.statLabel}>This Year</Text>
                      <Text style={styles.statValue}>{currency}{thisYearSpending.toFixed(0)}</Text>
                    </View>
                  </View>

                  <Text style={styles.subsectionTitle}>YTD Spending by member</Text>

                  {memberSpendingBreakdown.map((item, index) => (
                    <View key={item.member.id} style={styles.memberSpendingCard}>
                      <View style={styles.memberSpendingHeader}>
                        <View style={styles.memberInfo}>
                          <Text style={styles.memberAvatar}>{item.member.avatar}</Text>
                          <Text style={styles.memberName}>{item.member.name}</Text>
                        </View>
                        <Text style={styles.spendingAmount}>
                          {currency}{item.amount.toFixed(0)} ({item.percentage.toFixed(0)}%)
                        </Text>
                      </View>
                      <View style={styles.progressBar}>
                        <View
                          style={[styles.progressFill, { width: `${item.percentage}%` }]}
                        />
                      </View>
                      <TouchableOpacity
                        style={styles.memberActionButton}
                        onPress={() => handleMemberPaymentAdd(item.member.id)}
                      >
                        <Text style={styles.memberActionButtonText}>
                          Add any missing payments for {item.member.name}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </>
              )}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No payment data yet</Text>
              <Text style={styles.emptyText}>Record payments to track:</Text>
              <Text style={styles.emptyBullet}>• Monthly spending</Text>
              <Text style={styles.emptyBullet}>• Yearly totals</Text>
              <Text style={styles.emptyBullet}>• Cost per class</Text>
              {selectedMemberId && (
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={handleAddPayment}
                >
                  <Text style={styles.emptyButtonText}>Record Payment</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Attendance Insights */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ATTENDANCE INSIGHTS</Text>

          {hasAttendance ? (
            <>
              {/* Individual View */}
              {selectedMemberId ? (
                <>
                  <Text style={styles.subsectionTitle}>Attendance by Class</Text>

                  {memberClasses.length > 0 ? (
                    memberClasses.map((classItem) => {
                      const classTrend = getClassAttendanceTrend(classItem.id);
                      const maxClassAttendance = Math.max(...classTrend.map(t => t.count), 1);

                      return (
                        <View key={classItem.id} style={styles.chartCard}>
                          <Text style={styles.chartTitle}>{classItem.name}</Text>
                          <Text style={styles.chartSubtitle}>Last 8 Weeks</Text>

                          <View style={styles.chartContainer}>
                            <View style={styles.yAxisLabels}>
                              <Text style={styles.yAxisLabel}>{maxClassAttendance}</Text>
                              <Text style={styles.yAxisLabel}>{Math.round(maxClassAttendance * 0.5)}</Text>
                              <Text style={styles.yAxisLabel}>0</Text>
                            </View>
                            <View style={styles.barChart}>
                              {classTrend.map((item, index) => {
                                const barHeight = maxClassAttendance > 0 ? (item.count / maxClassAttendance) * 80 : 4;
                                return (
                                  <View key={index} style={styles.barContainer}>
                                    <View style={styles.barWrapper}>
                                      <View style={[styles.bar, { height: barHeight || 4 }]} />
                                    </View>
                                    <Text style={styles.barLabel}>{item.showLabel ? item.week : ''}</Text>
                                    <Text style={styles.barValue}>{item.count}</Text>
                                  </View>
                                );
                              })}
                            </View>
                          </View>

                          <TouchableOpacity
                            style={styles.memberActionButton}
                            onPress={() => handleAddAttendanceForClass(selectedMemberId, classItem.id)}
                          >
                            <Text style={styles.memberActionButtonText}>
                              Add any missing attendance for {classItem.name}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })
                  ) : (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyText}>
                        {selectedOption.label} is not enrolled in any classes yet
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                /* Family View */
                <>
                  <Text style={styles.subsectionTitle}>Family Attendance Comparison</Text>

                  {memberAttendanceBreakdown.map((item) => {
                    const maxTrend = Math.max(...item.trend.map(t => t.count), 1);
                    return (
                      <View key={item.member.id} style={styles.memberAttendanceCard}>
                        <View style={styles.memberHeader}>
                          <Text style={styles.memberAvatar}>{item.member.avatar}</Text>
                          <Text style={styles.memberName}>{item.member.name}</Text>
                        </View>

                        <View style={styles.miniChartContainer}>
                          <View style={styles.miniYAxisLabels}>
                            <Text style={styles.miniYAxisLabel}>{maxTrend}</Text>
                            <Text style={styles.miniYAxisLabel}>{Math.round(maxTrend * 0.5)}</Text>
                            <Text style={styles.miniYAxisLabel}>0</Text>
                          </View>
                          <View style={styles.miniBarChart}>
                            {item.trend.map((t, idx) => {
                              const barHeight = maxTrend > 0 ? (t.count / maxTrend) * 40 : 4;
                              return (
                                <View key={idx} style={styles.miniBarContainer}>
                                  <View style={styles.miniBarWrapper}>
                                    <View style={[styles.miniBar, { height: barHeight || 4 }]} />
                                  </View>
                                  <Text style={styles.miniBarLabel}>{t.month}</Text>
                                  <Text style={styles.miniBarValue}>{t.count}</Text>
                                </View>
                              );
                            })}
                          </View>
                        </View>

                        <TouchableOpacity
                          style={styles.memberActionButton}
                          onPress={() => handleMemberAttendanceAdd(item.member.id)}
                        >
                          <Text style={styles.memberActionButtonText}>
                            Add any missing attendance for {item.member.name}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </>
              )}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No attendance records yet</Text>
              {selectedMemberId && memberClasses.length > 0 ? (
                <>
                  <Text style={styles.emptyText}>
                    Mark attendance to see patterns and trends
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyButton}
                    onPress={handleAddAttendance}
                  >
                    <Text style={styles.emptyButtonText}>Mark Attendance</Text>
                  </TouchableOpacity>
                </>
              ) : selectedMemberId ? (
                <Text style={styles.emptyText}>
                  Enroll {selectedOption.label} in classes to start tracking attendance
                </Text>
              ) : null}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Dropdown Modal */}
      <Modal
        visible={selectorVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectorVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSelectorVisible(false)}
        >
          <View style={styles.modalContent}>
            {memberOptions.map((option) => (
              <TouchableOpacity
                key={option.id || 'all'}
                style={[
                  styles.modalOption,
                  option.id === selectedMemberId && styles.modalOptionSelected,
                ]}
                onPress={() => {
                  setSelectedMemberId(option.id);
                  setSelectorVisible(false);
                }}
              >
                {option.avatar && (
                  <Text style={styles.modalOptionAvatar}>{option.avatar}</Text>
                )}
                <Text
                  style={[
                    styles.modalOptionText,
                    option.id === selectedMemberId && styles.modalOptionTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
                {option.id === selectedMemberId && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
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
  selectorSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  selectorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dropdownAvatar: {
    fontSize: 20,
  },
  dropdownText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  dropdownIcon: {
    fontSize: 12,
    color: '#6B7280',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
    marginTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  chartSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 16,
  },
  chartContainer: {
    flexDirection: 'row',
  },
  yAxisLabels: {
    justifyContent: 'space-between',
    height: 100,
    paddingVertical: 0,
    marginRight: 8,
  },
  yAxisLabel: {
    fontSize: 9,
    color: '#6B7280',
    fontWeight: '500',
  },
  barChart: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 100,
  },
  barContainer: {
    alignItems: 'center',
    flex: 1,
  },
  barWrapper: {
    height: 80,
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 4,
  },
  bar: {
    width: 20,
    backgroundColor: '#2563EB',
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 4,
  },
  barValue: {
    fontSize: 9,
    color: '#1F2937',
    fontWeight: '600',
    marginTop: 2,
  },
  actionButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  memberSpendingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  memberSpendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberAvatar: {
    fontSize: 20,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  spendingAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 4,
  },
  memberAttendanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  miniChartContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  miniYAxisLabels: {
    justifyContent: 'space-between',
    height: 60,
    paddingVertical: 0,
    marginRight: 8,
  },
  miniYAxisLabel: {
    fontSize: 9,
    color: '#6B7280',
    fontWeight: '500',
  },
  miniBarChart: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 60,
  },
  miniBarContainer: {
    alignItems: 'center',
    flex: 1,
  },
  miniBarWrapper: {
    height: 40,
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 4,
  },
  miniBar: {
    width: 24,
    backgroundColor: '#2563EB',
    borderRadius: 3,
    minHeight: 4,
  },
  miniBarLabel: {
    fontSize: 9,
    color: '#6B7280',
    marginTop: 2,
  },
  miniBarValue: {
    fontSize: 9,
    color: '#1F2937',
    fontWeight: '600',
    marginTop: 2,
  },
  memberActionButton: {
    backgroundColor: '#DBEAFE',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  memberActionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E40AF',
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyBullet: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  emptyButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
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
    padding: 8,
    width: '80%',
    maxHeight: '70%',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 10,
    borderRadius: 8,
  },
  modalOptionSelected: {
    backgroundColor: '#EFF6FF',
  },
  modalOptionAvatar: {
    fontSize: 20,
  },
  modalOptionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  modalOptionTextSelected: {
    fontWeight: '600',
    color: '#2563EB',
  },
  checkmark: {
    fontSize: 18,
    color: '#2563EB',
    fontWeight: '700',
  },
});
