// frontend/src/services/api.service.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add authentication token
    this.client.interceptors.request.use(
      (config) => {
        // Get token from localStorage or sessionStorage
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
          console.debug('Adding Authorization header to request:', config.url);
        } else {
          console.warn('No auth token found for request:', config.url);
        }
        
        return config;
      },
      (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle auth errors
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          console.warn('401 Unauthorized - clearing auth token');
          // Clear stored tokens
          localStorage.removeItem('authToken');
          sessionStorage.removeItem('authToken');
          
          // Dispatch custom event to notify auth context
          window.dispatchEvent(new CustomEvent('auth-expired'));
        }
        return Promise.reject(error);
      }
    );
  }

  // Generic request method
  async request<T = any>(config: AxiosRequestConfig): Promise<T> {
    try {
      const response: AxiosResponse<T> = await this.client.request(config);
      return response.data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Convenience methods
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'GET', url });
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'POST', url, data });
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'PUT', url, data });
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'DELETE', url });
  }

  // Method to check if user is authenticated (has valid token)
  isAuthenticated(): boolean {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    return !!token;
  }

  // Method to manually set authorization header (for testing)
  setAuthToken(token: string): void {
    localStorage.setItem('authToken', token);
  }

  // Method to clear auth token
  clearAuthToken(): void {
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');
  }
}

export const apiClient = new ApiService();
export default ApiService;