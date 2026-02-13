export function getDayStart(now: Date, nextDayStartsAt: number): Date {
    const d = new Date(now.getTime());
    d.setUTCHours(nextDayStartsAt, 0, 0, 0);

    // If current time is before the day boundary, the "day" started yesterday
    if (now.getTime() < d.getTime()) {
        d.setUTCDate(d.getUTCDate() - 1);
    }

    return d;
}

export function isDueToday(dueDate: Date, now: Date, nextDayStartsAt: number): boolean {
    const dayStart = getDayStart(now, nextDayStartsAt);
    const nextDayStart = new Date(dayStart.getTime());
    nextDayStart.setUTCDate(nextDayStart.getUTCDate() + 1);

    return dueDate.getTime() < nextDayStart.getTime();
}

export function getDaysSince(date: Date, now: Date): number {
    const diffMs = now.getTime() - date.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}
