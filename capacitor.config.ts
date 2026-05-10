import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'app.omaad.wealth',
    appName: 'Omaad Wealth',
    webDir: 'dist/sakai-ng/browser',
    // Server config for development — comment out for production builds
    // server: {
    //     url: 'http://localhost:4200',
    //     cleartext: true
    // },
    ios: {
        // Allow scrolling (required for the app to work!)
        scrollEnabled: true,
        // Prevent native WKWebView from adding its own safe-area content insets;
        // CSS env(safe-area-inset-*) handles all spacing.
        contentInset: 'never',
        // Content mode
        preferredContentMode: 'mobile',
        // Background color behind the WebView
        backgroundColor: '#0f172a',
        // Allow inline media playback
        allowsLinkPreview: false,
    },
    plugins: {
        SplashScreen: {
            launchShowDuration: 1500,
            launchAutoHide: true,
            backgroundColor: '#0f172a',
            showSpinner: false,
            splashFullScreen: true,
            splashImmersive: true,
        },
        StatusBar: {
            style: 'DARK',
            backgroundColor: '#0f172a',
        },
    },
};

export default config;
