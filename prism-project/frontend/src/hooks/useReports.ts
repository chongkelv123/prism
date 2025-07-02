// frontend/src/hooks/useReports.ts
// FIXED VERSION - Add authentication headers to API calls

import { useState, useEffect } from 'react';

export interface Report {
  id: string;
  title: string;
  createdAt: string;
  status: 'completed' | 'processing' | 'failed';
  source: 'monday' | 'jira' | 'trofos';
  template?: string;
  platform?: string;
}

export interface ReportsData {
  reports: Report[];
  stats: {
    generated: number;
    scheduled: number;
    shared: number;
  };
  loading: boolean;
  error: string | null;
}

// ✅ HELPER FUNCTION TO GET AUTH HEADERS
const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

export const useReports = (): ReportsData => {
  const [data, setData] = useState<ReportsData>({
    reports: [],
    stats: {
      generated: 0,
      scheduled: 0,
      shared: 0
    },
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setData(prev => ({ ...prev, loading: true, error: null }));

        console.log('🔄 Fetching reports for Reports page...');

        // ✅ INCLUDE AUTH HEADERS IN REQUEST
        const response = await fetch('/api/reports', {
          headers: getAuthHeaders()
        });
        
        if (response.ok) {
          const rawReports = await response.json();
          console.log('✅ User-specific reports fetched:', rawReports.length);

          // Transform API data to match ReportsList component interface
          const transformedReports: Report[] = Array.isArray(rawReports) 
            ? rawReports.map((report: any, index: number) => ({
                // Transform _id → id
                id: report._id || report.id || `report-${index}`,
                title: report.title || `Report ${index + 1}`,
                createdAt: report.createdAt 
                  ? new Date(report.createdAt).toLocaleDateString() 
                  : 'Recently',
                status: ['completed', 'processing', 'failed'].includes(report.status) 
                  ? report.status 
                  : 'completed',
                // Transform platform → source
                source: (['monday', 'jira', 'trofos'].includes(report.platform) 
                  ? report.platform 
                  : 'jira') as 'monday' | 'jira' | 'trofos',
                template: report.template,
                platform: report.platform
              }))
            : [];

          // Calculate stats based on user's reports only
          const stats = {
            generated: transformedReports.length,
            scheduled: transformedReports.filter(r => r.status === 'processing').length,
            shared: transformedReports.filter(r => r.status === 'completed').length
          };

          setData({
            reports: transformedReports,
            stats,
            loading: false,
            error: null,
          });

        } else if (response.status === 401) {
          // ✅ HANDLE AUTHENTICATION ERRORS
          console.error('❌ Authentication required for reports');
          setData(prev => ({ 
            ...prev, 
            loading: false, 
            error: 'Authentication required. Please login again.' 
          }));
        } else {
          console.error('❌ Reports fetch failed:', response.status);
          const errorText = await response.text();
          setData(prev => ({ 
            ...prev, 
            loading: false, 
            error: `Failed to load reports: ${response.status}` 
          }));
        }
      } catch (error) {
        console.error('❌ Network error fetching reports:', error);
        setData(prev => ({ 
          ...prev, 
          loading: false, 
          error: 'Network error. Please check your connection.' 
        }));
      }
    };

    fetchReports();
  }, []);

  return data;
};