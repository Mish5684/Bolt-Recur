import { format, parseISO, isSameDay, getDay, subDays, addDays, isFuture, isPast } from 'date-fns';
import { ScheduleItem, ClassAttendance } from '../types/database';

export interface AttendanceButtonConfig {
  label: string;
  subtitle: string;
  disabled: boolean;
  color: 'primary' | 'success' | 'neutral';
  action?: () => void;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Check if a given date matches the schedule
 */
export function isScheduledDay(date: Date, schedule?: ScheduleItem[]): boolean {
  if (!schedule || schedule.length === 0) {
    return false;
  }

  const dayName = DAY_NAMES[getDay(date)];
  const matchingSchedule = schedule.find(s => s.day === dayName);

  return !!matchingSchedule;
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
  if (!schedule || schedule.length === 0) return undefined;

  const dayName = DAY_NAMES[getDay(date)];
  const scheduleItem = schedule.find(s => s.day === dayName);
  return scheduleItem?.time;
}


/**
 * Get the next scheduled class date in the future
 */
export function getNextScheduledClass(schedule?: ScheduleItem[], fromDate?: Date): { date: Date; time: string } | null {
  if (!schedule || schedule.length === 0) return null;

  const startDate = fromDate || new Date();

  // Check the next 14 days to find the next scheduled class
  for (let i = 1; i <= 14; i++) {
    const checkDate = addDays(startDate, i);
    const dayName = DAY_NAMES[getDay(checkDate)];
    const scheduleItem = schedule.find(s => s.day === dayName);

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
 * Simplified logic: button only handles TODAY, past dates via calendar
 */
export function getMarkAttendanceButtonState(
  schedule: ScheduleItem[] | undefined,
  attendanceRecords: ClassAttendance[]
): AttendanceButtonConfig {
  const today = new Date();
  const todayMarked = isAlreadyMarked(today, attendanceRecords);

  // BRANCH 1: Schedule exists
  if (schedule && schedule.length > 0) {
    const isTodayScheduled = isScheduledDay(today, schedule);

    // Case 1A: Today IS a scheduled day
    if (isTodayScheduled) {
      const scheduledTime = getScheduledTime(today, schedule);

      if (!todayMarked) {
        // State 1: Mark Today - Scheduled Day (Active)
        return {
          label: "MARK TODAY'S ATTENDANCE",
          subtitle: `${format(today, 'EEE, MMM d, yyyy')}${scheduledTime ? `\n${scheduledTime}` : ''}`,
          disabled: false,
          color: 'primary',
        };
      } else {
        // State 2: Today Marked - Scheduled Day (Success)
        const nextClass = getNextScheduledClass(schedule, today);
        return {
          label: "Today's attendance marked!",
          subtitle: nextClass ? `Next class: ${format(nextClass.date, 'EEE, MMM d')}` : '',
          disabled: true,
          color: 'success',
        };
      }
    }

    // Case 1B: Today is NOT a scheduled day
    else {
      // State 3: Not Scheduled Today (Informational)
      const nextClass = getNextScheduledClass(schedule, today);
      return {
        label: nextClass ? `Next class: ${format(nextClass.date, 'EEE, MMM d')}` : 'No upcoming classes',
        subtitle: nextClass?.time || '',
        disabled: true,
        color: 'neutral',
      };
    }
  }

  // BRANCH 2: No schedule
  else {
    if (!todayMarked) {
      // State 4: Mark Today - No Schedule (Active)
      return {
        label: "MARK TODAY'S ATTENDANCE",
        subtitle: format(today, 'EEE, MMM d, yyyy'),
        disabled: false,
        color: 'primary',
      };
    } else {
      // State 5: Today Marked - No Schedule (Success)
      return {
        label: "Today's attendance marked!",
        subtitle: format(today, 'EEE, MMM d, yyyy'),
        disabled: true,
        color: 'success',
      };
    }
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
  const classesPaidThisYear = paymentsThisYear.reduce((sum, p) => sum + p.classes_paid, 0);

  // Calculate cost per class based on payment plan (amount paid / classes paid for)
  // This shows what you're paying per class according to your payment structure
  const costPerClass = classesPaidThisYear > 0
    ? spentThisYear / classesPaidThisYear
    : 0;

  return {
    attendedThisYear: attendanceThisYear.length,
    attendedThisMonth: attendanceThisMonth.length,
    remaining: totalPaid - totalAttended,
    spentThisYear,
    costPerClass: Math.round(costPerClass * 100) / 100,
  };
}
