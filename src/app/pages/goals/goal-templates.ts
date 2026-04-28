/**
 * Goal templates with bundled photos. Each template is a starting point
 * for goal creation — name, image and color are pre-filled, then the user
 * can override anything in step 2 of the wizard.
 */

export type GoalTemplateKey =
    | 'emergency'
    | 'down_payment'
    | 'vacation'
    | 'wedding'
    | 'education'
    | 'retirement'
    | 'car'
    | 'custom';

export interface GoalTemplate {
    key: GoalTemplateKey;
    /** Thumbnail image for cards & template picker. */
    image: string;
    /** Wide hero image for the detail page. Falls back to `image` when absent. */
    imageFull: string;
    icon: string;
    /** Tailwind gradient classes used for accents. */
    gradient: string;
    /** i18n key resolving to the localized template label. */
    nameKey: string;
    /** i18n key resolving to a localized default goal name suggestion. */
    defaultNameKey: string;
}

export const GOAL_TEMPLATES: GoalTemplate[] = [
    {
        key: 'emergency',
        image: 'assets/goals/emergency.jpeg',
        imageFull: 'assets/goals/emergency-full.jpeg',
        icon: 'pi pi-shield',
        gradient: 'from-rose-500 to-red-500',
        nameKey: 'goals.template.emergency',
        defaultNameKey: 'goals.defaultName.emergency',
    },
    {
        key: 'down_payment',
        image: 'assets/goals/down_payment.jpeg',
        imageFull: 'assets/goals/down_payment.jpeg',
        icon: 'pi pi-home',
        gradient: 'from-amber-500 to-orange-500',
        nameKey: 'goals.template.down_payment',
        defaultNameKey: 'goals.defaultName.down_payment',
    },
    {
        key: 'vacation',
        image: 'assets/goals/vacation.jpeg',
        imageFull: 'assets/goals/vacation-full.jpeg',
        icon: 'pi pi-sun',
        gradient: 'from-sky-500 to-cyan-500',
        nameKey: 'goals.template.vacation',
        defaultNameKey: 'goals.defaultName.vacation',
    },
    {
        key: 'wedding',
        image: 'assets/goals/wedding.jpeg',
        imageFull: 'assets/goals/wedding-full.jpeg',
        icon: 'pi pi-heart-fill',
        gradient: 'from-pink-500 to-rose-500',
        nameKey: 'goals.template.wedding',
        defaultNameKey: 'goals.defaultName.wedding',
    },
    {
        key: 'education',
        image: 'assets/goals/education.jpeg',
        imageFull: 'assets/goals/education-full.jpeg',
        icon: 'pi pi-book',
        gradient: 'from-indigo-500 to-violet-500',
        nameKey: 'goals.template.education',
        defaultNameKey: 'goals.defaultName.education',
    },
    {
        key: 'retirement',
        image: 'assets/goals/retirement.jpeg',
        imageFull: 'assets/goals/retirement-full.jpeg',
        icon: 'pi pi-clock',
        gradient: 'from-emerald-500 to-teal-500',
        nameKey: 'goals.template.retirement',
        defaultNameKey: 'goals.defaultName.retirement',
    },
    {
        key: 'car',
        image: 'assets/goals/car.jpeg',
        imageFull: 'assets/goals/car-full.jpeg',
        icon: 'pi pi-car',
        gradient: 'from-blue-500 to-indigo-500',
        nameKey: 'goals.template.car',
        defaultNameKey: 'goals.defaultName.car',
    },
    {
        key: 'custom',
        image: 'assets/goals/savings.jpeg',
        imageFull: 'assets/goals/savings-full.jpeg',
        icon: 'pi pi-flag',
        gradient: 'from-slate-500 to-slate-600',
        nameKey: 'goals.template.custom',
        defaultNameKey: 'goals.defaultName.custom',
    },
];

export function templateOf(key: GoalTemplateKey | string | undefined | null): GoalTemplate {
    return GOAL_TEMPLATES.find(t => t.key === key) ?? GOAL_TEMPLATES[GOAL_TEMPLATES.length - 1];
}
