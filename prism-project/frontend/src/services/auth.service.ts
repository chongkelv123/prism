// frontend/src/services/auth.service.ts - FIXED VERSION
import { apiClient } from "./api.service";

export interface AuthToken {
    accessToken: string;
    refreshToken?: string;
}

export interface UserRegistration {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export const login = async (email: string, password: string): Promise<AuthToken> => {
    try {
        console.log('🔐 Auth Service: Making login request...');
        
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ email, password }),
        });

        console.log('📡 Auth Service: Response status:', response.status);

        if (!response.ok) {
            // Try to get error details from response
            let errorMessage = 'Login failed';
            
            try {
                const errorData = await response.json();
                console.log('❌ Auth Service: Error response:', errorData);
                
                // Handle specific error cases
                if (response.status === 400) {
                    // Bad request - validation errors
                    if (errorData.errors && errorData.errors.length > 0) {
                        errorMessage = errorData.errors.map((e: any) => e.msg).join(', ');
                    } else if (errorData.message) {
                        errorMessage = errorData.message;
                    } else {
                        errorMessage = 'Invalid request data';
                    }
                } else if (response.status === 401) {
                    errorMessage = 'Invalid email or password';
                } else if (errorData.message) {
                    errorMessage = errorData.message;
                }
                
                throw new Error(errorMessage);
            } catch (parseError) {
                // If JSON parsing fails, provide a generic error based on status
                if (response.status === 400) {
                    throw new Error('Invalid request. Please check your input.');
                } else if (response.status === 401) {
                    throw new Error('Invalid email or password');
                } else if (response.status === 500) {
                    throw new Error('Server error. Please try again later.');
                } else {
                    throw new Error('Login failed. Please try again later.');
                }
            }
        }
        
        const data = await response.json();
        console.log('✅ Auth Service: Login successful');
        
        // Ensure the response has the expected format
        if (!data.accessToken) {
            throw new Error('Invalid response format from server');
        }
        
        return data;
    } catch (error) {
        console.error('❌ Auth Service: Login failed:', error);
        
        // Handle network errors
        if (error instanceof TypeError && error.message.includes('fetch')) {
            throw new Error('Network error. Please check your connection.');
        }
        
        // Re-throw other errors
        throw error;
    }
};

export const register = async (userData: UserRegistration): Promise<{userId: string}> => {
    try {
      console.log('🔐 Auth Service: Making registration request...');
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(userData),
      });
      
      console.log('📡 Auth Service: Registration response status:', response.status);
      
      if (!response.ok) {
        // Try to parse error message from response
        try {
          const errorData = await response.json();
          console.log('❌ Auth Service: Registration error response:', errorData);
          
          if (response.status === 409) {
            throw new Error('Email already in use');
          } else if (response.status === 400) {
            if (errorData.errors && errorData.errors.length > 0) {
              throw new Error(errorData.errors.map((e: any) => e.msg).join(', '));
            } else {
              throw new Error(errorData.message || 'Invalid registration data');
            }
          } else {
            throw new Error(errorData.message || 'Registration failed');
          }
        } catch (parseError) {
          // If JSON parsing fails, provide a generic error
          throw new Error('Registration failed. Please try again later.');
        }
      }
      
      const data = await response.json();
      console.log('✅ Auth Service: Registration successful');
      return data;
    } catch (error) {
      console.error('❌ Auth Service: Registration failed:', error);
      
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error. Please check your connection.');
      }
      
      // Re-throw other errors
      throw error;
    }
  };

export const getCurrentUser = async (): Promise<any> => {
    try {
        console.log('🔐 Auth Service: Getting current user...');
        const response = await apiClient.get('/api/auth/me');
        console.log('✅ Auth Service: Current user fetched successfully');
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