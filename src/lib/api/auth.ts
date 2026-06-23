import { apiFetch, ApiResponse } from "./client";

// Define the specific shapes of the `data` objects returned by these endpoints
interface RequestOTPData {
    message: string;
}

interface VerifyOTPData {
    access_token: string;
    refresh_token: string;
    is_verified?: boolean;
}

export const requestOTP = async (email: string): Promise<ApiResponse<RequestOTPData>> => {
    return apiFetch<ApiResponse<RequestOTPData>>("/v1/auth/trigger-otp", {
        method: "POST",
        body: JSON.stringify({ email }),
    });
};

export const verifyOTP = async (email: string, otp: string): Promise<ApiResponse<VerifyOTPData>> => {
    return apiFetch<ApiResponse<VerifyOTPData>>("/v1/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ email, otp }),
    });
};