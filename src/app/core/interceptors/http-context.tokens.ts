import { HttpContextToken } from '@angular/common/http';

/**
 * Set on requests that must NOT participate in the 401→refresh/redirect flow —
 * primarily the /auth/refresh call itself (else a 401 there recurses forever).
 * Lives in its own file so AuthService and the interceptor can both import it
 * without a circular dependency.
 */
export const SKIP_AUTH = new HttpContextToken<boolean>(() => false);
