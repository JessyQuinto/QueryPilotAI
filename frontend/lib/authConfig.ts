import { Configuration, LogLevel } from '@azure/msal-browser';

export type AuthRuntimeConfig = {
    clientId: string;
    authority: string;
    redirectUri: string;
    postLogoutRedirectUri: string;
    apiScope?: string;
};

export const DEFAULT_API_SCOPE = 'api://439a8182-8c80-49ce-8dc7-703af41c724c/access_as_user';

function normalizeUri(value: string | undefined, origin: string): string {
    const trimmed = value?.trim();

    if (!trimmed) {
        return origin;
    }

    if (trimmed.startsWith('/')) {
        return new URL(trimmed, origin).toString();
    }

    return trimmed;
}

function ensureValidAuthority(authority: string): string {
    const trimmed = authority.trim().replace(/\/$/, '');

    if (!trimmed || trimmed.includes('tenant.ciamlogin.com/tenant-id')) {
        throw new Error('La autoridad de Azure AD no es valida. Configure NEXT_PUBLIC_AZURE_AD_AUTHORITY con el tenant real.');
    }

    try {
        const parsed = new URL(trimmed);
        if (parsed.protocol !== 'https:') {
            throw new Error('Authority must use HTTPS.');
        }
    }
    catch {
        throw new Error('La autoridad de Azure AD no tiene un formato valido.');
    }

    return trimmed;
}

export function resolveAuthRuntimeConfig(config: Partial<AuthRuntimeConfig>): AuthRuntimeConfig {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const clientId = config.clientId?.trim();

    if (!clientId || clientId === 'client-id-placeholder') {
        throw new Error('El cliente de Azure AD no esta configurado.');
    }

    const redirectUri = normalizeUri(config.redirectUri, origin);
    const postLogoutRedirectUri = normalizeUri(config.postLogoutRedirectUri ?? config.redirectUri, origin);

    const configuredApiScope = config.apiScope?.trim();

    return {
        clientId,
        authority: ensureValidAuthority(config.authority ?? ''),
        redirectUri,
        postLogoutRedirectUri,
        apiScope: configuredApiScope || DEFAULT_API_SCOPE
    };
}

export function createMsalConfig(config: AuthRuntimeConfig): Configuration {
    return {
        auth: {
            clientId: config.clientId,
            authority: config.authority,
            redirectUri: config.redirectUri,
            postLogoutRedirectUri: config.postLogoutRedirectUri
        },
        cache: {
            // Keep the Entra session across refreshes and browser restarts.
            cacheLocation: 'localStorage',
            storeAuthStateInCookie: false,
        },
        system: {
            loggerOptions: {
                loggerCallback: (level, message, containsPii) => {
                    if (containsPii) {
                        return;
                    }

                    // This is common when users close consent/auth popup manually.
                    // Avoid surfacing it as a hard runtime error overlay in Next.js dev.
                    if (message.includes('PopupHandler.monitorPopupForHash - window closed')) {
                        console.warn(message);
                        return;
                    }

                    switch (level) {
                        case LogLevel.Error:
                            console.error(message);
                            return;
                        case LogLevel.Warning:
                            console.warn(message);
                            return;
                    }
                }
            }
        }
    };
}

export const loginRequest = {
    scopes: ['openid', 'profile', 'offline_access', DEFAULT_API_SCOPE],
    prompt: 'select_account'
};
