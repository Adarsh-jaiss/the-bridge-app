import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import { QueryClient } from "@tanstack/react-query";

export const BASE_URL = "http://10.106.151.78:8080/api";
// const BASE_URL = "http://192.168.2.197:8080/api"

// WebSocket base URL derived from BASE_URL so the REST and WS endpoints always
// point at the same host/port (http -> ws, https -> wss).
export const WS_BASE_URL = BASE_URL.replace(/^http/i, "ws");
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
            staleTime: 1000 * 60 * 5, // 5 minutes
        },
    },
});

export interface ApiResponse<T = any> {
    success: boolean;
    data: T;
}

export interface ApiErrorResponse {
    success: boolean;
    error: {
        code: string;
        message: string;
        fields?: Record<string, string>;
    };
}

export class ApiError extends Error {
    public status: number;
    public response: {
        data: any;
    };

    constructor(status: number, data: any, message?: string) {
        super(message || data?.error?.message || "Something went wrong");
        this.name = "ApiError";
        this.status = status;
        this.response = { data };
    }
}

export const apiFetch = async <T = any>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> => {
    const url = `${BASE_URL}${endpoint}`;

    const headers = new Headers(options.headers || {});
    if (!headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }

    const accessToken = await SecureStore.getItemAsync("access_token");
    if (accessToken) {
        headers.set("Authorization", `Bearer ${accessToken}`);
    }

    const refreshToken = await SecureStore.getItemAsync("refresh_token");
    if (refreshToken) {
        const existingCookie = headers.get("Cookie") || "";
        headers.set(
            "Cookie",
            existingCookie
                ? `${existingCookie}; refresh_token=${refreshToken}`
                : `refresh_token=${refreshToken}`
        );
    }

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
        await SecureStore.deleteItemAsync("access_token");
        await SecureStore.deleteItemAsync("refresh_token");
        router.replace("/auth/login");
        throw new ApiError(response.status, null, "Unauthorized");
    }

    const newAccessToken = response.headers.get("x-new-access-token") || response.headers.get("X-New-Access-Token");
    if (newAccessToken) {
        await SecureStore.setItemAsync("access_token", newAccessToken);
    }

    const setCookieHeader = response.headers.get("set-cookie");
    if (setCookieHeader) {
        const cookies = setCookieHeader.split(/,(?=\s*[a-zA-Z0-9_-]+\=)/);
        const refreshTokenCookie = cookies.find((c: string) => c.trim().startsWith("refresh_token="));
        if (refreshTokenCookie) {
            const token = refreshTokenCookie.split(";")[0].split("=")[1];
            if (token) {
                await SecureStore.setItemAsync("refresh_token", token);
            }
        }
    }

    let data;
    try {
        data = await response.json();
    } catch (e) {
        data = null;
    }

    if (!response.ok) {
        throw new ApiError(response.status, data);
    }

    return data as T;
};