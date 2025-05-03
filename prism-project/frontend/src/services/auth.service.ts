import apiClient from "./api.service";

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
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
            // Check if the response has valid JSON
            try {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Invalid credentials');
            } catch (parseError) {
                // If JSON parsing fails, provide a generic error
                throw new Error('Login failed. Please try again later.');
            }
        }
        
        return response.json();
    } catch (error) {
        // Handle any network errors
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('Network error. Please check your connection.');
    }
};

export const register = async (userData: UserRegistration): Promise<{userId: string}> => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      
      if (!response.ok) {
        // Try to parse error message from response
        try {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Registration failed');
        } catch (parseError) {
          // If JSON parsing fails, provide a generic error
          throw new Error('Registration failed. Please try again later.');
        }
      }
      
      return response.json();
    } catch (error) {
      // Handle any network errors
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error. Please check your connection.');
    }
  };

  export const getCurrentUser = async (): Promise<any> => {
    try {
        const response = await apiClient.get('/api/auth/me');
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const logout = (): void => {
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');
    // Clear any user data in application state if needed
};