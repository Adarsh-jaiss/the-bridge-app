import { apiClient, ApiResponse } from "./client";

// Define the specific shapes of the `data` objects returned by these endpoints
interface RequestOTPData {
    message: string;
}

interface VerifyOTPData {
    access_token: string;
    refresh_token: string;
}

export const requestOTP = async (email: string): Promise<ApiResponse<RequestOTPData>> => {
    // Using the generic wrapper to type the response properly
    const response = await apiClient.post<ApiResponse<RequestOTPData>>("/v1/auth/trigger-otp", { email });
    return response.data;
};

export const verifyOTP = async (email: string, otp: string): Promise<ApiResponse<VerifyOTPData>> => {
    const response = await apiClient.post<ApiResponse<VerifyOTPData>>("/v1/auth/verify-otp", { email, otp });
    return response.data;
};