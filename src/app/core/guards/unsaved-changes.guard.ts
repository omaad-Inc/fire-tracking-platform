import { CanDeactivateFn } from '@angular/router';

/**
 * Implemented by routed components that hold an in-progress form (P2-FE-9).
 * Return true to allow leaving, false to stay. May be async (e.g. a confirm).
 */
export interface CanComponentDeactivate {
    canDeactivate: () => boolean | Promise<boolean>;
}

/**
 * Prompt before navigating away from a routed component with unsaved input
 * (e.g. the add-asset wizard). Components opt in by implementing
 * `CanComponentDeactivate`; anything else is always allowed to deactivate.
 */
export const unsavedChangesGuard: CanDeactivateFn<CanComponentDeactivate> = (component) =>
    component?.canDeactivate ? component.canDeactivate() : true;
