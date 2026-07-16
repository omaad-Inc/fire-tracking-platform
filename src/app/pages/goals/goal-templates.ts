/**
 * Goal templates with bundled photos. Each template is a starting point
 * for goal creation — name, image and color are pre-filled, then the user
 * can override anything in step 2 of the wizard.
 */

export type GoalTemplateKey =
    | 'emergency'
    | 'down_payment'
    | 'land'
    | 'family_support'
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
    /**
     * Tailwind gradient classes used for the template's icon-tile accent.
     *
     * In the redesigned (Midnight + Ochre) identity all templates share the
     * same brand-tone gradient — the template's photo is what visually
     * distinguishes one goal type from another, NOT the icon-tile color.
     */
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
        gradient: 'from-brand-700 to-brand-500',
        nameKey: 'goals.template.emergency',
        defaultNameKey: 'goals.defaultName.emergency',
    },
    {
        key: 'down_payment',
        image: 'assets/goals/down_payment.jpeg',
        imageFull: 'assets/goals/down_payment.jpeg',
        icon: 'pi pi-home',
        gradient: 'from-brand-700 to-brand-500',
        nameKey: 'goals.template.down_payment',
        defaultNameKey: 'goals.defaultName.down_payment',
    },
    {
        key: 'land',
        image: 'assets/goals/down_payment.jpeg',
        imageFull: 'assets/goals/down_payment.jpeg',
        icon: 'pi pi-map-marker',
        gradient: 'from-brand-700 to-brand-500',
        nameKey: 'goals.template.land',
        defaultNameKey: 'goals.defaultName.land',
    },
    {
        key: 'family_support',
        image: 'assets/goals/savings.jpeg',
        imageFull: 'assets/goals/savings-full.jpeg',
        icon: 'pi pi-users',
        gradient: 'from-brand-700 to-brand-500',
        nameKey: 'goals.template.family_support',
        defaultNameKey: 'goals.defaultName.family_support',
    },
    {
        key: 'vacation',
        image: 'assets/goals/vacation.jpeg',
        imageFull: 'assets/goals/vacation-full.jpeg',
        icon: 'pi pi-sun',
        gradient: 'from-brand-700 to-brand-500',
        nameKey: 'goals.template.vacation',
        defaultNameKey: 'goals.defaultName.vacation',
    },
    {
        key: 'wedding',
        image: 'assets/goals/wedding.jpeg',
        imageFull: 'assets/goals/wedding-full.jpeg',
        icon: 'pi pi-heart-fill',
        gradient: 'from-brand-700 to-brand-500',
        nameKey: 'goals.template.wedding',
        defaultNameKey: 'goals.defaultName.wedding',
    },
    {
        key: 'education',
        image: 'assets/goals/education.jpeg',
        imageFull: 'assets/goals/education-full.jpeg',
        icon: 'pi pi-book',
        gradient: 'from-brand-700 to-brand-500',
        nameKey: 'goals.template.education',
        defaultNameKey: 'goals.defaultName.education',
    },
    {
        key: 'retirement',
        image: 'assets/goals/retirement.jpeg',
        imageFull: 'assets/goals/retirement-full.jpeg',
        icon: 'pi pi-clock',
        gradient: 'from-brand-700 to-brand-500',
        nameKey: 'goals.template.retirement',
        defaultNameKey: 'goals.defaultName.retirement',
    },
    {
        key: 'car',
        image: 'assets/goals/car.jpeg',
        imageFull: 'assets/goals/car-full.jpeg',
        icon: 'pi pi-car',
        gradient: 'from-brand-700 to-brand-500',
        nameKey: 'goals.template.car',
        defaultNameKey: 'goals.defaultName.car',
    },
    {
        key: 'custom',
        image: 'assets/goals/savings.jpeg',
        imageFull: 'assets/goals/savings-full.jpeg',
        icon: 'pi pi-flag',
        gradient: 'from-brand-700 to-brand-500',
        nameKey: 'goals.template.custom',
        defaultNameKey: 'goals.defaultName.custom',
    },
];

export function templateOf(key: GoalTemplateKey | string | undefined | null): GoalTemplate {
    return GOAL_TEMPLATES.find(t => t.key === key) ?? GOAL_TEMPLATES[GOAL_TEMPLATES.length - 1];
}
