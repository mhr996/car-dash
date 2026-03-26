import { formatDate } from '@/utils/date-formatter';

type LogLike = {
    car?: { created_at?: string | null } | null;
    deal?: { status?: string | null; cancelled_at?: string | null } | null;
};

/**
 * For activity logs table: show user-chosen cancellation date when deal is cancelled,
 * otherwise car creation date.
 */
export function getLogTableDisplayDate(log: LogLike): string {
    const deal = log.deal;
    if (deal?.status === 'cancelled' && deal.cancelled_at) {
        const s = formatDate(String(deal.cancelled_at));
        if (s) return s;
    }
    if (log.car?.created_at) {
        return formatDate(log.car.created_at) || '';
    }
    return '';
}

/** Sort key aligned with display date (cancelled deals by cancelled_at). */
export function getLogSortTimestamp(log: LogLike): number {
    if (log.deal?.status === 'cancelled' && log.deal?.cancelled_at) {
        return new Date(String(log.deal.cancelled_at)).getTime();
    }
    return new Date(log.car?.created_at || 0).getTime();
}
