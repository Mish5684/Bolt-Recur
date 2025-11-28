/**
 * Schedule Utilities for Marketing Agents
 *
 * Schedule format: Array of {day: string, time: string}
 * Example: [
 *   {day: "Monday", time: "15:00"},
 *   {day: "Wednesday", time: "15:00"}
 * ]
 */

export interface ScheduleItem {
  day: string; // Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday
  time: string; // HH:mm format (24-hour)
}

const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday'
];

/**
 * Get the next scheduled class time from a schedule array
 * @param schedule Array of schedule items
 * @param currentTime Current time to calculate from
 * @returns Date object of next scheduled time, or null if no future times
 */
export function getNextScheduledTime(
  schedule: ScheduleItem[],
  currentTime: Date = new Date()
): Date | null {
  if (!schedule || schedule.length === 0) {
    return null;
  }

  const currentDay = currentTime.getDay(); // 0 = Sunday, 6 = Saturday
  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();

  // Convert schedule items to sortable format
  const scheduledTimes: Array<{ dayIndex: number; hour: number; minute: number }> = [];

  schedule.forEach(item => {
    const dayIndex = DAYS_OF_WEEK.indexOf(item.day);
    if (dayIndex === -1) return; // Invalid day

    const [hourStr, minuteStr] = item.time.split(':');
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);

    if (isNaN(hour) || isNaN(minute)) return; // Invalid time

    scheduledTimes.push({ dayIndex, hour, minute });
  });

  if (scheduledTimes.length === 0) {
    return null;
  }

  // Find next occurrence
  let nextOccurrence: Date | null = null;
  let minDaysAhead = 8; // More than a week

  scheduledTimes.forEach(({ dayIndex, hour, minute }) => {
    let daysAhead = dayIndex - currentDay;

    // If it's today, check if time has passed
    if (daysAhead === 0) {
      const currentTotalMinutes = currentHour * 60 + currentMinute;
      const scheduledTotalMinutes = hour * 60 + minute;

      if (scheduledTotalMinutes <= currentTotalMinutes) {
        // Time has passed today, look for next week
        daysAhead = 7;
      }
    } else if (daysAhead < 0) {
      // Day is earlier in week, so next occurrence is next week
      daysAhead += 7;
    }

    if (daysAhead < minDaysAhead) {
      minDaysAhead = daysAhead;
      const nextDate = new Date(currentTime);
      nextDate.setDate(nextDate.getDate() + daysAhead);
      nextDate.setHours(hour, minute, 0, 0);
      nextOccurrence = nextDate;
    }
  });

  return nextOccurrence;
}

/**
 * Check if a class is scheduled for today
 * @param schedule Array of schedule items
 * @param currentTime Current time to check
 * @returns true if class is scheduled for today
 */
export function isScheduledToday(
  schedule: ScheduleItem[],
  currentTime: Date = new Date()
): boolean {
  if (!schedule || schedule.length === 0) {
    return false;
  }

  const currentDay = DAYS_OF_WEEK[currentTime.getDay()];

  return schedule.some(item => item.day === currentDay);
}

/**
 * Get scheduled time for a specific day
 * @param schedule Array of schedule items
 * @param dayName Day name (e.g., "Monday")
 * @returns Time string (HH:mm) or null if not scheduled
 */
export function getScheduledTimeForDay(
  schedule: ScheduleItem[],
  dayName: string
): string | null {
  if (!schedule || schedule.length === 0) {
    return null;
  }

  const item = schedule.find(item => item.day === dayName);
  return item ? item.time : null;
}

/**
 * Get scheduled times for today
 * @param schedule Array of schedule items
 * @param currentTime Current time to check
 * @returns Array of time strings (HH:mm) for today
 */
export function getScheduledTimesForToday(
  schedule: ScheduleItem[],
  currentTime: Date = new Date()
): string[] {
  if (!schedule || schedule.length === 0) {
    return [];
  }

  const currentDay = DAYS_OF_WEEK[currentTime.getDay()];

  return schedule
    .filter(item => item.day === currentDay)
    .map(item => item.time);
}

/**
 * Calculate hours until a specific date/time
 * @param from Start time
 * @param to End time
 * @returns Number of hours (can be fractional)
 */
export function getHoursUntil(from: Date, to: Date): number {
  const milliseconds = to.getTime() - from.getTime();
  return milliseconds / (1000 * 60 * 60);
}

/**
 * Format time for display
 * @param date Date object
 * @returns Formatted time string (e.g., "3:00 PM")
 */
export function formatTime(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, '0');

  return `${displayHours}:${displayMinutes} ${ampm}`;
}

/**
 * Get user's local hour from evaluation time and timezone
 * @param evaluationTime Current evaluation time (UTC or any timezone)
 * @param timezone User's timezone (e.g., "America/New_York")
 * @returns Hour in user's local time (0-23)
 */
export function getUserLocalHour(evaluationTime: Date, timezone: string = 'UTC'): number {
  try {
    const localTime = new Date(evaluationTime.toLocaleString('en-US', { timeZone: timezone }));
    return localTime.getHours();
  } catch (error) {
    console.error('Invalid timezone:', timezone, error);
    return evaluationTime.getHours(); // Fallback to UTC
  }
}

/**
 * Check if current time is within quiet hours (10 PM - 8 AM)
 * @param currentTime Current time
 * @param timezone User's timezone
 * @returns true if within quiet hours
 */
export function isQuietHours(currentTime: Date, timezone: string = 'UTC'): boolean {
  const localHour = getUserLocalHour(currentTime, timezone);
  return localHour >= 22 || localHour < 8;
}

/**
 * Calculate days since a date
 * @param date Date to calculate from
 * @returns Number of days (integer)
 */
export function getDaysSince(date: string | Date): number {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const milliseconds = now.getTime() - targetDate.getTime();
  return Math.floor(milliseconds / (1000 * 60 * 60 * 24));
}

/**
 * Validate schedule format
 * @param schedule Schedule array to validate
 * @returns true if valid format
 */
export function isValidSchedule(schedule: any): schedule is ScheduleItem[] {
  if (!Array.isArray(schedule)) {
    return false;
  }

  return schedule.every(item => {
    if (typeof item !== 'object' || !item.day || !item.time) {
      return false;
    }

    // Validate day
    if (!DAYS_OF_WEEK.includes(item.day)) {
      return false;
    }

    // Validate time format (HH:mm)
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(item.time)) {
      return false;
    }

    return true;
  });
}
