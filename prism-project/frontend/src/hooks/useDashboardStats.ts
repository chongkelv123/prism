// frontend/src/hooks/useDashboardStats.ts
// FIXED VERSION - Add authentication headers to reports API calls

import { useState, useEffect } from 'react';

export interface DashboardStats {
  reportsGenerated: number;
  templatesAvailable: number;
  platformConnections: number;
  recentReports: any[];
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

export const useDashboardStats = (): DashboardStats => {
  const [stats, setStats] = useState<DashboardStats>({
    reportsGenerated: 0,
    templatesAvailable: 3, // Static - templates are hardcoded
    platformConnections: 0,
    recentReports: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setStats(prev => ({ ...prev, loading: true, error: null }));

        console.log('🔄 Fetching live dashboard data...');

        // ✅ FETCH USER-SPECIFIC REPORTS WITH AUTH HEADERS
        const reportsResponse = await fetch('/api/reports', {
          headers: getAuthHeaders()
        });
        
        let reports = [];
        
        if (reportsResponse.ok) {
          reports = await reportsResponse.json();
          console.log('✅ User-specific reports fetched:', reports.length);
        } else if (reportsResponse.status === 401) {
          console.error('❌ Authentication required for reports');
          setStats(prev => ({
            ...prev,
            loading: false,
            error: 'Authentication required. Please login again.'
          }));
          return;
        } else {
          console.error('❌ Reports fetch failed:', reportsResponse.status);
        }

        // ✅ FETCH USER-SPECIFIC CONNECTIONS WITH AUTH HEADERS
        let connections = [];
        try {
          const connectionsResponse = await fetch('/api/connections', {
            headers: getAuthHeaders()
          });
          
          if (connectionsResponse.ok) {
            connections = await connectionsResponse.json();
            console.log('✅ User connections fetched:', connections.length);
          } else if (connectionsResponse.status === 401) {
            console.log('⚠️ Authentication required for connections (expected)');
          } else {
            console.log('ℹ️ Connections fetch failed:', connectionsResponse.status);
          }
        } catch (error) {
          console.log('ℹ️ Connections not available:', error);
        }

        // ✅ GET USER-SPECIFIC RECENT REPORTS (last 5)
        const recentReports = Array.isArray(reports) 
          ? reports
              .sort((a, b) => new Date(b.createdAt || b.created_at || 0).getTime() - new Date(a.createdAt || a.created_at || 0).getTime())
              .slice(0, 5)
          : [];

        const finalStats = {
          reportsGenerated: Array.isArray(reports) ? reports.length : 0,
          templatesAvailable: 3, // Static value
          platformConnections: Array.isArray(connections) ? connections.length : 0,
          recentReports,
          loading: false,
          error: null,
        };

        console.log('📊 Dashboard stats updated:', finalStats);
        setStats(finalStats);

      } catch (error) {
        console.error('❌ Error fetching dashboard stats:', error);
        setStats(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to load dashboard data. Please try again.'
        }));
      }
    };

    fetchStats();
  }, []);

  return stats;
};