interface GoogleCredentialResponse {
    credential: string;
    select_by: string;
    clientId?: string;
}

interface GoogleIdConfiguration {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    context?: 'signin' | 'signup' | 'use';
    itp_support?: boolean;
    use_fedcm_for_prompt?: boolean;
    ux_mode?: 'popup' | 'redirect';
    login_uri?: string;
}

interface Google {
    accounts: {
        id: {
            initialize: (config: GoogleIdConfiguration) => void;
            prompt: (notification?: (n: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean; getDismissedReason: () => string }) => void) => void;
            renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
            revoke: (hint: string, callback?: () => void) => void;
            cancel: () => void;
        };
    };
}

declare const google: Google;
