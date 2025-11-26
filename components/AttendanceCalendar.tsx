import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isSameDay,
  parseISO,
  isFuture,
  subMonths,
} from 'date-fns';
import { ClassAttendance, ScheduleItem } from '../shared/types/database';
import { isScheduledDay } from '../shared/utils/attendanceUtils';

interface AttendanceCalendarProps {
  attendance: ClassAttendance[];
  schedule?: ScheduleItem[];
  onDeleteAttendance: (attendanceId: string) => void;
  onAddAttendance: (date: Date) => void;
}

export default function AttendanceCalendar({
  attendance,
  schedule,
  onDeleteAttendance,
  onAddAttendance,
}: AttendanceCalendarProps) {
  const [selectedMonthOffset, setSelectedMonthOffset] = useState(0);
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const today = new Date();

  // Debug logging for schedule data
  console.log('📅 Calendar Schedule:', JSON.stringify(schedule, null, 2));

  const currentMonth = subMonths(today, selectedMonthOffset);
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const firstDayOfWeek = getDay(monthStart);
  const paddingDays = Array(firstDayOfWeek).fill(null);

  const getAttendanceForDate = (date: Date): ClassAttendance | undefined => {
    return attendance.find((record) => {
      const recordDate = parseISO(record.class_date);
      return isSameDay(recordDate, date);
    });
  };

  const handleDatePress = (date: Date) => {
    const futureDate = isFuture(date);
    if (futureDate) return;

    const attendanceRecord = getAttendanceForDate(date);

    if (attendanceRecord) {
      Alert.alert(
        'Remove Attendance',
        `Remove attendance for ${format(date, 'MMM d, yyyy')}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => onDeleteAttendance(attendanceRecord.id),
          },
        ]
      );
    } else {
      Alert.alert(
        'Mark Attendance',
        `Mark attendance for ${format(date, 'MMM d, yyyy')}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Mark',
            onPress: () => onAddAttendance(date),
          },
        ]
      );
    }
  };

  const monthOptions = [0, 1, 2, 3, 4, 5].map((offset) => {
    const date = subMonths(today, offset);
    return {
      offset,
      label: format(date, 'MMMM yyyy'),
      date,
    };
  });

  const renderMonthPicker = () => {
    if (!showMonthPicker) return null;

    return (
      <View style={styles.monthPickerOverlay}>
        <TouchableOpacity
          style={styles.monthPickerBackdrop}
          activeOpacity={1}
          onPress={() => setShowMonthPicker(false)}
        />
        <View style={styles.monthPickerContainer}>
          {monthOptions.map((option) => (
            <TouchableOpacity
              key={option.offset}
              style={[
                styles.monthPickerItem,
                option.offset === selectedMonthOffset && styles.monthPickerItemSelected,
              ]}
              onPress={() => {
                setSelectedMonthOffset(option.offset);
                setShowMonthPicker(false);
              }}
            >
              <Text
                style={[
                  styles.monthPickerItemText,
                  option.offset === selectedMonthOffset && styles.monthPickerItemTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.monthSelector}
        onPress={() => setShowMonthPicker(true)}
      >
        <Text style={styles.monthSelectorText}>{format(currentMonth, 'MMMM yyyy')}</Text>
        <Text style={styles.monthSelectorArrow}>▼</Text>
      </TouchableOpacity>

      <View style={styles.calendarContainer}>
        <View style={styles.weekDaysContainer}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
            <View key={index} style={styles.weekDayCell}>
              <Text style={styles.weekDayText}>{day}</Text>
            </View>
          ))}
        </View>

        <View style={styles.daysGrid}>
          {paddingDays.map((_, index) => (
            <View key={`empty-${index}`} style={styles.dayCell} />
          ))}

          {daysInMonth.map((day, index) => {
            const attendanceRecord = getAttendanceForDate(day);
            const hasAttendance = !!attendanceRecord;
            const scheduled = isScheduledDay(day, schedule);
            const futureDate = isFuture(day);
            const isToday = isSameDay(day, today);

            // Debug logging for first few days
            if (index < 3) {
              console.log(`Day ${format(day, 'EEE MMM d')}: scheduled=${!!scheduled}, hasAttendance=${hasAttendance}`);
            }

            return (
              <TouchableOpacity
                key={index}
                style={styles.dayCell}
                onPress={() => handleDatePress(day)}
                disabled={futureDate}
              >
                <View style={styles.dayCellContent}>
                  <Text
                    style={[
                      styles.dayText,
                      futureDate && styles.futureDayText,
                      isToday && styles.todayText,
                    ]}
                  >
                    {format(day, 'd')}
                  </Text>

                  {hasAttendance ? (
                    <View style={styles.attendedDot} />
                  ) : scheduled && !futureDate ? (
                    <View style={styles.scheduledCircle} />
                  ) : scheduled && futureDate ? (
                    <View style={styles.scheduledCircleFuture} />
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={styles.attendedDot} />
          <Text style={styles.legendText}>Attended</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.scheduledCircle} />
          <Text style={styles.legendText}>Scheduled</Text>
        </View>
      </View>

      <Text style={styles.hint}>Tap any past date to mark/unmark</Text>

      {renderMonthPicker()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  monthSelectorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginRight: 8,
  },
  monthSelectorArrow: {
    fontSize: 12,
    color: '#6B7280',
  },
  calendarContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
  todayText: {
    color: '#2563EB',
    fontWeight: '700',
  },
  futureDayText: {
    color: '#D1D5DB',
  },
  attendedDot: {
    position: 'absolute',
    bottom: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  scheduledCircle: {
    position: 'absolute',
    bottom: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: 'transparent',
  },
  scheduledCircleFuture: {
    position: 'absolute',
    bottom: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: 'transparent',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    gap: 24,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
  },
  hint: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  monthPickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  monthPickerBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  monthPickerContainer: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  monthPickerItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  monthPickerItemSelected: {
    backgroundColor: '#EFF6FF',
  },
  monthPickerItemText: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
    textAlign: 'center',
  },
  monthPickerItemTextSelected: {
    color: '#2563EB',
    fontWeight: '700',
  },
});
