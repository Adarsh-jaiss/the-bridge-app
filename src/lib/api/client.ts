import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";

const BASE_URL = "http://10.156.21.17:8080/api"; // Updated from localhost for physical device testing

export const apiClient = axios.create({
    baseURL: BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
    timeout: 10000,
});

// A generic wrapper for successful responses based on your Swagger UI
export interface ApiResponse<T = any> {
    success: boolean;
    data: T;
}

// The exact error structure from your Swagger UI (400/500 errors)
export interface ApiErrorResponse {
    success: boolean;
    error: {
        code: string;
        message: string;
        fields?: Record<string, string>; // Handles the additionalProp key-value pairs
    };
}


apiClient.interceptors.request.use(
    async (config) => {
        const accessToken = await SecureStore.getItemAsync("access_token");
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// response interceptor (Refresh Logic)
let isRefreshing = false;
let failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach((prom) => {
        if (error) prom.reject(error);
        else prom.resolve(token as string);
    });
    failedQueue = [];
};

apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // If the error is 401 and we haven't already retried this specific request
        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {

            if (isRefreshing) {
                // If already refreshing, queue the request until the new token arrives
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return apiClient(originalRequest);
                    })
                    .catch((err) => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const refreshToken = await SecureStore.getItemAsync("refresh_token");
                if (!refreshToken) throw new Error("No refresh token found");

                // NOTE: Use a raw axios call here, NOT apiClient, to prevent interceptor infinite loops!
                const response = await axios.post(`${BASE_URL}/auth/refresh`, {
                    refresh_token: refreshToken,
                });

                // Assuming your backend returns the new tokens inside the `data` object
                const newAccessToken = response.data.data.access_token;
                const newRefreshToken = response.data.data.refresh_token;

                await SecureStore.setItemAsync("access_token", newAccessToken);
                if (newRefreshToken) {
                    await SecureStore.setItemAsync("refresh_token", newRefreshToken);
                }

                // Update the failed request with the new token
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

                // Release the queued requests
                processQueue(null, newAccessToken);

                // Retry the original request
                return apiClient(originalRequest);

            } catch (refreshError) {
                // If refresh fails (e.g., token expired or invalid), log the user out
                processQueue(refreshError, null);

                await SecureStore.deleteItemAsync("access_token");
                await SecureStore.deleteItemAsync("refresh_token");

                // Redirect to your base auth route
                router.replace("/auth/login");

                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);