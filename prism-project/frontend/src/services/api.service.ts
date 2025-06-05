// frontend/src/services/api.service.ts - FIXED VERSION (No automatic redirect)
import axios from 'axios';

// Get API URL from environment variables
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Create axios instance with common configuration
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add authentication token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors - FIXED VERSION
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized errors (expired or invalid token)
    if (error.response && error.response.status === 401) {
      console.warn('🔒 API: 401 Unauthorized - Token may be invalid or expired');
      
      // Clear stored tokens
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('authToken');
      
      // ⚠️ IMPORTANT: Do NOT automatically redirect here!
      // Let individual components/contexts handle 401 errors appropriately
      // Some contexts (like ConnectionsProvider) should handle 401s gracefully
      // Only login-specific operations should trigger redirects
      
      // Add a custom property to the error to indicate auth failure
      error.isAuthError = true;
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;