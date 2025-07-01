// Create this file: frontend/src/hooks/useDashboardStats.ts
import { useState, useEffect } from 'react';

export interface DashboardStats {
  reportsGenerated: number;
  templatesAvailable: number;
  platformConnections: number;
  recentReports: any[];
  loading: boolean;
  error: string | null;
}

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

        // Fetch reports (we know this works - returns 90 reports!)
        const reportsResponse = await fetch('/api/reports');
        let reports = [];
        
        if (reportsResponse.ok) {
          reports = await reportsResponse.json();
          console.log('✅ Reports fetched:', reports.length);
        } else {
          console.error('❌ Reports fetch failed:', reportsResponse.status);
        }

        // Fetch connections (with auth, so might fail)
        let connections = [];
        try {
          const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
          const connectionsResponse = await fetch('/api/connections', {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
          });
          
          if (connectionsResponse.ok) {
            connections = await connectionsResponse.json();
            console.log('✅ Connections fetched:', connections.length);
          } else {
            console.log('ℹ️ Connections require auth (expected)');
          }
        } catch (error) {
          console.log('ℹ️ Connections not available without auth');
        }

        // Get recent reports (last 5)
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
          error: 'Failed to load dashboard statistics'
        }));
      }
    };

    fetchStats();

    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  return stats;
};