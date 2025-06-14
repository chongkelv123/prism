// frontend/src/services/auth.service.ts - FIXED VERSION
import { apiClient } from './api.service';

export const login = async (email: string, password: string) => {
    try {
        console.log('🔐 Auth Service: Attempting login for:', email);
        const response = await apiClient.post('/api/auth/login', { email, password });
        console.log('✅ Auth Service: Login successful');
        console.log('🔍 Response (already extracted data):', response); // ← This IS the data
        return response; // ← FIXED: Return response directly, not response.data
    } catch (error: any) {
        console.error('❌ Auth Service: Login failed:', error);
        throw error;
    }
};

export const register = async (userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
}) => {
    try {
        console.log('📝 Auth Service: Attempting registration for:', userData.email);
        const response = await apiClient.post('/api/auth/register', userData);
        
        if (!response) {
            throw new Error('Network error occurred during registration. Please try again later.');
        }
        
        const data = response.data;
        console.log('✅ Auth Service: Registration successful');
        return data;
    } catch (error: any) {
        console.error('❌ Auth Service: Registration failed:', error);
        
        if (error.response?.status === 409) {
            throw new Error('An account with this email already exists. Please try logging in instead.');
        }
        
        if (error.response?.status === 400) {
            const errorMsg = error.response.data?.message || 'Invalid registration data provided.';
            throw new Error(errorMsg);
        }
        
        if (error.response?.status >= 500) {
            throw new Error('Server error occurred during registration. Please try again later.');
        }
        
        if (error instanceof TypeError && error.message.includes('fetch')) {
            throw new Error('Network error. Please check your connection.');
        }
        
        throw error;
    }
};

export const getCurrentUser = async (): Promise<any> => {
    try {
        console.log('🔐 Auth Service: Getting current user...');
        const response = await apiClient.get('/api/auth/me');
        console.log('✅ Auth Service: Current user fetched successfully');
        console.log('👤 User data structure:', response); // ← Response is already the data
        console.log('👤 User keys:', Object.keys(response)); // ← See what fields exist
        console.log('👤 User id field:', response.id); // ← Check id specifically
        console.log('👤 User _id field:', response._id); // ← Check _id specifically  
        return response;
    } catch (error: any) {
        console.error('❌ Auth Service: Get current user failed:', error);
        
        // Handle 401 errors specifically for getCurrentUser
        if (error?.response?.status === 401) {
            console.warn('🔒 Auth: getCurrentUser failed due to invalid/expired token');
            throw new Error('Authentication expired');
        }
        throw error;
    }
};

export const logout = (): void => {
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');
    console.log('🚪 Auth Service: User logged out, tokens cleared');
};