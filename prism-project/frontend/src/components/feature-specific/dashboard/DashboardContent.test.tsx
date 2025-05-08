// src/components/feature-specific/dashboard/DashboardContent.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DashboardContent from './DashboardContent';
import { useNavigate } from 'react-router-dom';

// Mock dependencies
vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn()
}));

// Mock child components
vi.mock('./StatCard', () => ({
  default: ({ title, value }: { title: string; value: number }) => (
    <div data-testid="mock-stat-card">
      <span>{title}</span>: <span>{value}</span>
    </div>
  )
}));

vi.mock('./QuickActions', () => ({
  default: () => <div data-testid="mock-quick-actions">Quick Actions</div>
}));

vi.mock('../reports/RecentReports', () => ({
  default: ({ limit }: { limit: number }) => <div data-testid="mock-recent-reports">Recent Reports (Limit: {limit})</div>
}));

vi.mock('./ConnectedPlatforms', () => ({
  default: () => <div data-testid="mock-connected-platforms">Connected Platforms</div>
}));

describe('DashboardContent Component', () => {
  const mockNavigate = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    (useNavigate as unknown as vi.Mock).mockReturnValue(mockNavigate);
  });
  
  it('renders welcome banner with correct text', () => {
    render(<DashboardContent />);
    
    expect(screen.getByText('Welcome to PRISM')).toBeInTheDocument();
    expect(screen.getByText('Transform your project data into professional PowerPoint presentations')).toBeInTheDocument();
  });
  
  it('renders create report button in welcome banner', () => {
    render(<DashboardContent />);
    
    const createReportButton = screen.getByRole('button', { name: /Create Report/i });
    expect(createReportButton).toBeInTheDocument();
  });
  
  it('navigates to report creation page when create report button is clicked', async () => {
    const user = userEvent.setup();
    render(<DashboardContent />);
    
    const createReportButton = screen.getByRole('button', { name: /Create Report/i });
    await user.click(createReportButton);
    
    expect(mockNavigate).toHaveBeenCalledWith('/reports/create');
  });
  
  it('renders stat cards with correct data', () => {
    render(<DashboardContent />);
    
    const statCards = screen.getAllByTestId('mock-stat-card');
    expect(statCards).toHaveLength(3);
    
    expect(statCards[0]).toHaveTextContent('Reports Generated: 12');
    expect(statCards[1]).toHaveTextContent('Templates Available: 8');
    expect(statCards[2]).toHaveTextContent('Platform Connections: 2');
  });
  
  it('renders all dashboard sections', () => {
    render(<DashboardContent />);
    
    expect(screen.getByTestId('mock-quick-actions')).toBeInTheDocument();
    expect(screen.getByTestId('mock-recent-reports')).toBeInTheDocument();
    expect(screen.getByTestId('mock-connected-platforms')).toBeInTheDocument();
  });
  
  it('passes correct limit to RecentReports component', () => {
    render(<DashboardContent />);
    
    expect(screen.getByTestId('mock-recent-reports')).toHaveTextContent('Recent Reports (Limit: 3)');
  });
});