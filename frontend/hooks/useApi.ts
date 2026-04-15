import { useCallback } from "react";
import { useMsal } from "@azure/msal-react";
import { logger } from "../lib/logger";
import { resolveAuthRuntimeConfig } from "../lib/authConfig";

const FALLBACK_API_SCOPE = "api://439a8182-8c80-49ce-8dc7-703af41c724c/access_as_user";

type ApiRequestInit = RequestInit & {
    allowInteractiveAuth?: boolean;
};

export function useApi() {
    const { instance, accounts } = useMsal();
    const runtimeConfig = resolveAuthRuntimeConfig({
        clientId: process.env.NEXT_PUBLIC_AZURE_AD_CLIENT_ID,
        authority: process.env.NEXT_PUBLIC_AZURE_AD_AUTHORITY,
        redirectUri: process.env.NEXT_PUBLIC_REDIRECT_URI,
        postLogoutRedirectUri: process.env.NEXT_PUBLIC_POST_LOGOUT_REDIRECT_URI,
        apiScope: process.env.NEXT_PUBLIC_API_SCOPE,
    });
    const configuredApiScope = runtimeConfig.apiScope || FALLBACK_API_SCOPE;
    const apiScopes = [configuredApiScope];

    const isInvalidScopeError = (error: unknown) => {
        const text = error instanceof Error ? error.message : String(error);
        return /invalid_scope|AADSTS70011/i.test(text);
    };

    const isPopupClosedError = (error: unknown) => {
        const text = error instanceof Error ? error.message : String(error);
        return /popup_window_error|user_cancelled|window closed/i.test(text);
    };

    const acquireToken = useCallback(async (
        scopes: string[],
        account: (typeof accounts)[number],
        allowInteractiveAuth: boolean
    ) => {
        try {
            return await instance.acquireTokenSilent({ scopes, account });
        } catch (error) {
            logger.warn("Silent token acquisition failed", {
                error: error instanceof Error ? error.message : String(error),
                allowInteractiveAuth,
                scopes,
            });

            if (!allowInteractiveAuth) {
                throw new Error("Tu sesion necesita reautenticacion. Repite la accion desde un boton o flujo interactivo.");
            }

            return await instance.acquireTokenPopup({ scopes, account });
        }
    }, [instance]);

    const fetchWithAuth = useCallback(async (url: string, options: ApiRequestInit = {}) => {
        const account = instance.getActiveAccount() ?? accounts[0] ?? instance.getAllAccounts()[0];
        if (!account) {
            logger.error("No active account - user not authenticated");
            throw new Error("No hay una cuenta activa. El usuario no esta autenticado.");
        }

        if (instance.getActiveAccount()?.homeAccountId !== account.homeAccountId) {
            instance.setActiveAccount(account);
        }

        const { allowInteractiveAuth = false, ...requestOptions } = options;

        let tokenResponse;
        try {
            tokenResponse = await acquireToken(apiScopes, account, allowInteractiveAuth);
        } catch (error) {
            if (isInvalidScopeError(error) && configuredApiScope !== FALLBACK_API_SCOPE) {
                logger.warn("Configured API scope is invalid. Retrying with project default scope.", {
                    configuredApiScope,
                    fallbackScope: FALLBACK_API_SCOPE,
                });

                tokenResponse = await acquireToken([FALLBACK_API_SCOPE], account, allowInteractiveAuth);
            } else if (isInvalidScopeError(error)) {
                throw new Error(
                    "El scope configurado para la API no es valido. Verifica NEXT_PUBLIC_API_SCOPE y que el scope access_as_user exista en Microsoft Entra ID."
                );
            } else if (isPopupClosedError(error)) {
                throw new Error('Autenticacion cancelada. Vuelve a intentarlo para continuar.');
            } else {
                throw error;
            }
        }

        const token = tokenResponse.accessToken;
        if (!token) {
            throw new Error("No se pudo obtener un token de acceso valido para la API.");
        }

        const headers: Record<string, string> = {
            ...(requestOptions.headers as Record<string, string>),
            Authorization: `Bearer ${token}`,
        };

        const method = requestOptions.method?.toUpperCase() ?? "GET";
        const start = performance.now();
        const response = await fetch(url, { ...requestOptions, headers });
        const ms = Math.round(performance.now() - start);

        const endpoint = url.replace(/^https?:\/\/[^/]+/, "");
        logger.info(`API ${method} ${endpoint}`, {
            status: response.status,
            durationMs: ms,
            ok: response.ok,
        });

        return response;
    }, [accounts, acquireToken, configuredApiScope, instance]);

    const activeAccount = instance.getActiveAccount() ?? accounts[0] ?? instance.getAllAccounts()[0];
    const userId = activeAccount?.localAccountId || activeAccount?.homeAccountId || "";

    return { fetchWithAuth, userId, account: activeAccount };
}
