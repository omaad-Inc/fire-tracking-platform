import { SavingGoal } from '../../core/services/api.service';
import { GoalTemplateKey } from './goal-templates';

/**
 * Resolves the template key for a goal.
 *
 * Falls back to 'custom' when the goal has no template_key set (e.g. legacy
 * goals created before the column existed).
 */
export function templateKeyOf(goal: Pick<SavingGoal, 'template_key'> | null | undefined): GoalTemplateKey {
    const key = goal?.template_key as GoalTemplateKey | null | undefined;
    return key ?? 'custom';
}

export type GoalStatus = 'completed' | 'on_track' | 'at_risk' | 'no_deadline' | 'no_target';

/**
 * Computes a status for a goal based on time elapsed vs. progress made.
 *
 *  - completed   : current >= target
 *  - no_target   : target_amount <= 0 (just a tracker)
 *  - no_deadline : target set, but no target_date
 *  - on_track    : progress% >= time-elapsed%
 *  - at_risk     : progress% < time-elapsed% (or past deadline)
 */
export function computeStatus(goal: Pick<SavingGoal, 'current_amount' | 'target_amount' | 'target_date' | 'created_at'>): GoalStatus {
    if (!goal.target_amount || goal.target_amount <= 0) return 'no_target';
    if (goal.current_amount >= goal.target_amount) return 'completed';
    if (!goal.target_date) return 'no_deadline';

    const now = new Date();
    const target = new Date(goal.target_date);
    if (target.getTime() <= now.getTime()) return 'at_risk';

    const created = new Date(goal.created_at);
    const totalMs = Math.max(1, target.getTime() - created.getTime());
    const elapsedMs = Math.max(0, now.getTime() - created.getTime());
    const timeRatio = elapsedMs / totalMs;
    const progressRatio = goal.current_amount / goal.target_amount;

    return progressRatio >= timeRatio ? 'on_track' : 'at_risk';
}

/**
 * Months remaining until target_date (rounded up to nearest whole month).
 * Returns null if no deadline.
 */
export function monthsRemaining(targetDate: string | null | undefined): number | null {
    if (!targetDate) return null;
    const target = new Date(targetDate);
    const now = new Date();
    const diffMs = target.getTime() - now.getTime();
    if (diffMs <= 0) return 0;
    return Math.ceil(diffMs / (30.44 * 24 * 60 * 60 * 1000));
}

/**
 * Suggested monthly contribution to hit the target by the deadline.
 * Returns null if no deadline or already complete.
 */
export function monthlyContributionNeeded(goal: Pick<SavingGoal, 'current_amount' | 'target_amount' | 'target_date'>): number | null {
    const months = monthsRemaining(goal.target_date);
    if (months === null || months <= 0) return null;
    const remaining = Math.max(0, goal.target_amount - goal.current_amount);
    if (remaining <= 0) return null;
    return remaining / months;
}

export function progressPercent(current: number, target: number): number {
    if (!target || target <= 0) return 0;
    return Math.min(100, Math.round((current / target) * 100));
}
