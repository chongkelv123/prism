// frontend/src/hooks/useReports.ts

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

        // Use the same endpoint that Dashboard uses successfully
        const response = await fetch('/api/reports');
        
        if (response.ok) {
          const rawReports = await response.json();
          console.log('✅ Raw reports fetched:', rawReports.length);

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

          console.log('✅ Transformed reports:', transformedReports.length);
          console.log('📋 Sample transformed report:', transformedReports[0]);

          // Calculate stats from real data
          const stats = {
            generated: transformedReports.length,
            scheduled: 0, // Not implemented yet
            shared: 0     // Not implemented yet
          };

          setData({
            reports: transformedReports,
            stats,
            loading: false,
            error: null,
          });

          console.log('📊 Reports page data updated:', {
            reportsCount: transformedReports.length,
            stats
          });

        } else {
          console.error('❌ Reports fetch failed:', response.status);
          throw new Error(`Failed to fetch reports: ${response.status}`);
        }

      } catch (error) {
        console.error('❌ Error fetching reports:', error);
        setData(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to load reports'
        }));
      }
    };

    fetchReports();

    // Refresh every 30 seconds (same as Dashboard)
    const interval = setInterval(fetchReports, 30000);
    return () => clearInterval(interval);
  }, []);

  return data;
};