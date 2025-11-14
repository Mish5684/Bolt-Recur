import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
} from 'react-native';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isFuture, isSameDay, parseISO } from 'date-fns';
import { ClassAttendance } from '../shared/types/database';

interface AttendanceCalendarProps {
  attendance: ClassAttendance[];
  onDeleteAttendance: (attendanceId: string) => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const CALENDAR_WIDTH = SCREEN_WIDTH - 32;
const PEEK_WIDTH = 40;

export default function AttendanceCalendar({ attendance, onDeleteAttendance }: AttendanceCalendarProps) {
  const [currentMonthOffset, setCurrentMonthOffset] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const today = new Date();
  const minMonthOffset = -2;
  const maxMonthOffset = 0;

  const getMonthDates = (monthOffset: number) => {
    const targetDate = addMonths(today, monthOffset);
    const start = startOfMonth(targetDate);
    const end = endOfMonth(targetDate);
    return {
      monthDate: targetDate,
      days: eachDayOfInterval({ start, end }),
    };
  };

  const getAttendanceForDate = (date: Date) => {
    return attendance.find((record) => {
      const recordDate = parseISO(record.class_date);
      return isSameDay(recordDate, date);
    });
  };

  const handleDatePress = (date: Date, attendanceRecord?: ClassAttendance) => {
    if (isFuture(date)) return;

    if (attendanceRecord) {
      Alert.alert(
        'Delete Attendance',
        'Do you want to delete this attendance record?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => onDeleteAttendance(attendanceRecord.id),
          },
        ]
      );
    }
  };

  const handleSwipe = (direction: 'left' | 'right') => {
    let newOffset = currentMonthOffset;

    if (direction === 'left' && currentMonthOffset > minMonthOffset) {
      newOffset = currentMonthOffset - 1;
    } else if (direction === 'right' && currentMonthOffset < maxMonthOffset) {
      newOffset = currentMonthOffset + 1;
    }

    if (newOffset !== currentMonthOffset) {
      setCurrentMonthOffset(newOffset);
      const scrollToX = (maxMonthOffset - newOffset) * (CALENDAR_WIDTH + 16);
      scrollViewRef.current?.scrollTo({ x: scrollToX, animated: true });
    }
  };

  const renderCalendar = (monthOffset: number) => {
    const { monthDate, days } = getMonthDates(monthOffset);
    const firstDayOfWeek = getDay(days[0]);
    const paddingDays = Array(firstDayOfWeek).fill(null);
    const allDays = [...paddingDays, ...days];

    return (
      <View key={monthOffset} style={styles.calendarContainer}>
        <Text style={styles.monthHeader}>
          {format(monthDate, 'MMMM yyyy')}
        </Text>

        <View style={styles.weekDaysContainer}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
            <View key={index} style={styles.weekDayCell}>
              <Text style={styles.weekDayText}>{day}</Text>
            </View>
          ))}
        </View>

        <View style={styles.daysGrid}>
          {allDays.map((day, index) => {
            if (!day) {
              return <View key={`empty-${index}`} style={styles.dayCell} />;
            }

            const attendanceRecord = getAttendanceForDate(day);
            const hasAttendance = !!attendanceRecord;
            const isFutureDate = isFuture(day);

            return (
              <TouchableOpacity
                key={index}
                style={styles.dayCell}
                onPress={() => handleDatePress(day, attendanceRecord)}
                disabled={isFutureDate && !hasAttendance}
              >
                <View style={styles.dayCellContent}>
                  <Text
                    style={[
                      styles.dayText,
                      isFutureDate && styles.futureDayText,
                    ]}
                  >
                    {format(day, 'd')}
                  </Text>
                  {hasAttendance && (
                    <View style={styles.attendanceDot} />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled={false}
        showsHorizontalScrollIndicator={false}
        scrollEnabled={true}
        contentContainerStyle={styles.scrollContent}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(event) => {
          const offsetX = event.nativeEvent.contentOffset.x;
          const page = Math.round(offsetX / (CALENDAR_WIDTH + 16));
          const newMonthOffset = maxMonthOffset - page;

          if (newMonthOffset >= minMonthOffset && newMonthOffset <= maxMonthOffset) {
            setCurrentMonthOffset(newMonthOffset);
          }
        }}
        decelerationRate="fast"
        snapToInterval={CALENDAR_WIDTH + 16}
        snapToAlignment="start"
        contentOffset={{ x: (maxMonthOffset - currentMonthOffset) * (CALENDAR_WIDTH + 16), y: 0 }}
      >
        {[minMonthOffset, minMonthOffset + 1, maxMonthOffset].map((offset) => renderCalendar(offset))}
      </ScrollView>

      <View style={styles.swipeHint}>
        <Text style={styles.swipeHintText}>← Swipe to view previous months →</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  calendarContainer: {
    width: CALENDAR_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  monthHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  weekDaysContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  dayCellContent: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dayText: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  futureDayText: {
    color: '#D1D5DB',
  },
  attendanceDot: {
    position: 'absolute',
    bottom: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  swipeHint: {
    marginTop: 12,
    alignItems: 'center',
  },
  swipeHintText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
});
