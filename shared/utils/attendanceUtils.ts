import { format, parseISO, isSameDay, getDay, subDays, addDays, isFuture, isPast } from 'date-fns';
import { ScheduleItem, ClassAttendance } from '../types/database';

export type ButtonState = 'mark_today' | 'marked_today' | 'mark_missed' | 'caught_up';

export interface AttendanceButtonConfig {
  state: ButtonState;
  label: string;
  date: Date;
  time?: string;
  subtitle?: string;
  disabled: boolean;
  color: 'primary' | 'success' | 'warning';
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Check if a given date matches the schedule
 */
export function isScheduledDay(date: Date, schedule?: ScheduleItem[]): ScheduleItem | null {
  if (!schedule || schedule.length === 0) return null;

  const dayName = DAY_NAMES[getDay(date)];
  const matchingSchedule = schedule.find(s => s.day === dayName);

  return matchingSchedule || null;
}

/**
 * Check if attendance exists for a given date
 */
export function isAlreadyMarked(date: Date, attendanceRecords: ClassAttendance[]): boolean {
  return attendanceRecords.some(record => {
    const recordDate = parseISO(record.class_date);
    return isSameDay(recordDate, date);
  });
}

/**
 * Get the scheduled time for a given date
 */
export function getScheduledTime(date: Date, schedule?: ScheduleItem[]): string | undefined {
  const scheduleItem = isScheduledDay(date, schedule);
  return scheduleItem?.time;
}

/**
 * Find the most recent unmarked scheduled class
 * Looks back from today to the class start date (or last 90 days max)
 */
export function findMostRecentUnmarkedClass(
  schedule: ScheduleItem[],
  attendanceRecords: ClassAttendance[],
  classStartDate?: Date
): { date: Date; time: string } | null {
  const today = new Date();
  const unmarkedClasses: { date: Date; time: string }[] = [];

  // Determine how far back to look
  // If we have a class start date, use that; otherwise look back 90 days max
  const startDate = classStartDate || subDays(today, 90);
  const daysToCheck = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  // Check each day going back from yesterday to the start date
  for (let i = 1; i <= daysToCheck; i++) {
    const checkDate = subDays(today, i);

    // Stop if we've gone before the start date
    if (checkDate < startDate) break;

    const scheduleItem = isScheduledDay(checkDate, schedule);

    if (scheduleItem && !isAlreadyMarked(checkDate, attendanceRecords)) {
      unmarkedClasses.push({
        date: checkDate,
        time: scheduleItem.time,
      });
    }
  }

  // Return the most recent (first in array since we're going backwards)
  return unmarkedClasses.length > 0 ? unmarkedClasses[0] : null;
}

/**
 * Get the next scheduled class date in the future
 */
export function getNextScheduledClass(schedule?: ScheduleItem[]): { date: Date; time: string } | null {
  if (!schedule || schedule.length === 0) return null;

  const today = new Date();

  // Check the next 14 days to find the next scheduled class
  for (let i = 1; i <= 14; i++) {
    const checkDate = addDays(today, i);
    const scheduleItem = isScheduledDay(checkDate, schedule);

    if (scheduleItem) {
      return {
        date: checkDate,
        time: scheduleItem.time,
      };
    }
  }

  return null;
}

/**
 * Main function to determine the state of the "Mark Attendance" button
 */
export function getMarkAttendanceButtonState(
  schedule: ScheduleItem[] | undefined,
  attendanceRecords: ClassAttendance[],
  classStartDate?: Date
): AttendanceButtonConfig {
  const today = new Date();

  // PRIORITY 1: Check if today is scheduled
  if (schedule && schedule.length > 0) {
    const todayScheduleItem = isScheduledDay(today, schedule);

    if (todayScheduleItem) {
      if (isAlreadyMarked(today, attendanceRecords)) {
        return {
          state: 'marked_today',
          label: 'MARKED TODAY',
          date: today,
          time: todayScheduleItem.time,
          disabled: true,
          color: 'success',
        };
      } else {
        return {
          state: 'mark_today',
          label: 'MARK TODAY\'S ATTENDANCE',
          date: today,
          time: todayScheduleItem.time,
          disabled: false,
          color: 'primary',
        };
      }
    }

    // PRIORITY 2: Check for unmarked scheduled classes since class start date
    const missedClass = findMostRecentUnmarkedClass(schedule, attendanceRecords, classStartDate);
    if (missedClass) {
      return {
        state: 'mark_missed',
        label: 'MARK MISSED CLASS',
        date: missedClass.date,
        time: missedClass.time,
        disabled: false,
        color: 'warning',
      };
    }

    // PRIORITY 3: All caught up (only show if user has attended at least one class)
    if (attendanceRecords.length > 0) {
      const nextClass = getNextScheduledClass(schedule);
      return {
        state: 'caught_up',
        label: 'ALL CAUGHT UP',
        date: today,
        subtitle: nextClass ? `Next class: ${format(nextClass.date, 'EEE, MMM d')}` : undefined,
        time: nextClass?.time,
        disabled: true,
        color: 'success',
      };
    }

    // PRIORITY 4: Schedule exists but no attendance yet - show next class as action
    const nextClass = getNextScheduledClass(schedule);
    if (nextClass) {
      return {
        state: 'mark_today',
        label: 'MARK ATTENDANCE',
        date: today,
        subtitle: `Next class: ${format(nextClass.date, 'EEE, MMM d')} · ${nextClass.time}`,
        disabled: false,
        color: 'primary',
      };
    }

    // Fallback: No next class found, just show mark today
    return {
      state: 'mark_today',
      label: 'MARK ATTENDANCE',
      date: today,
      disabled: false,
      color: 'primary',
    };
  }

  // PRIORITY 5: No schedule - simple mode
  if (isAlreadyMarked(today, attendanceRecords)) {
    return {
      state: 'marked_today',
      label: 'MARKED TODAY',
      date: today,
      disabled: true,
      color: 'success',
    };
  } else {
    return {
      state: 'mark_today',
      label: 'MARK TODAY\'S ATTENDANCE',
      date: today,
      disabled: false,
      color: 'primary',
    };
  }
}

/**
 * Get all scheduled days for a given month
 */
export function getScheduledDaysInMonth(
  schedule: ScheduleItem[] | undefined,
  year: number,
  month: number
): Date[] {
  if (!schedule || schedule.length === 0) return [];

  const scheduledDays: Date[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    if (isScheduledDay(date, schedule)) {
      scheduledDays.push(date);
    }
  }

  return scheduledDays;
}

/**
 * Calculate metrics for the class
 */
export interface ClassMetrics {
  attendedThisYear: number;
  attendedThisMonth: number;
  remaining: number;
  spentThisYear: number;
  costPerClass: number;
}

export function calculateClassMetrics(
  attendanceRecords: ClassAttendance[],
  payments: { amount: number; classes_paid: number; payment_date: string }[]
): ClassMetrics {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Filter attendance for this year
  const attendanceThisYear = attendanceRecords.filter(record => {
    const recordDate = parseISO(record.class_date);
    return recordDate.getFullYear() === currentYear;
  });

  // Filter attendance for this month
  const attendanceThisMonth = attendanceRecords.filter(record => {
    const recordDate = parseISO(record.class_date);
    return recordDate.getFullYear() === currentYear && recordDate.getMonth() === currentMonth;
  });

  // Calculate total paid classes and amount
  const totalPaid = payments.reduce((sum, p) => sum + p.classes_paid, 0);
  const totalAttended = attendanceRecords.length;

  // Filter payments for this year
  const paymentsThisYear = payments.filter(payment => {
    const paymentDate = parseISO(payment.payment_date);
    return paymentDate.getFullYear() === currentYear;
  });

  const spentThisYear = paymentsThisYear.reduce((sum, p) => sum + p.amount, 0);

  // Calculate cost per class (based on this year's data)
  const costPerClass = attendanceThisYear.length > 0
    ? spentThisYear / attendanceThisYear.length
    : 0;

  return {
    attendedThisYear: attendanceThisYear.length,
    attendedThisMonth: attendanceThisMonth.length,
    remaining: totalPaid - totalAttended,
    spentThisYear,
    costPerClass: Math.round(costPerClass * 100) / 100,
  };
}
