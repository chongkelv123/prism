// src/components/feature-specific/dashboard/QuickActions.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuickActions from './QuickActions';
import { useNavigate } from 'react-router-dom';

// Mock dependencies
vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn()
}));

describe('QuickActions Component', () => {
  const mockNavigate = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
    (useNavigate as unknown as vi.Mock).mockReturnValue(mockNavigate);
  });
  
  it('renders all action cards correctly', () => {
    render(<QuickActions />);
    
    // Check for all action titles
    expect(screen.getByText('Create Report')).toBeInTheDocument();
    expect(screen.getByText('Manage Templates')).toBeInTheDocument();
    expect(screen.getByText('Connect Platform')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    
    // Check for action descriptions
    expect(screen.getByText('Generate a new PowerPoint report')).toBeInTheDocument();
    expect(screen.getByText('View and customize report templates')).toBeInTheDocument();
    expect(screen.getByText('Add a new project management tool')).toBeInTheDocument();
    expect(screen.getByText('Configure your account preferences')).toBeInTheDocument();
  });
  
  it('navigates to correct route when Create Report action is clicked', async () => {
    const user = userEvent.setup();
    render(<QuickActions />);
    
    const createReportCard = screen.getByText('Create Report').closest('div');
    await user.click(createReportCard!);
    
    expect(mockNavigate).toHaveBeenCalledWith('/reports/create');
  });
  
  it('navigates to correct route when Manage Templates action is clicked', async () => {
    const user = userEvent.setup();
    render(<QuickActions />);
    
    const manageTemplatesCard = screen.getByText('Manage Templates').closest('div');
    await user.click(manageTemplatesCard!);
    
    expect(mockNavigate).toHaveBeenCalledWith('/templates');
  });
  
  it('navigates to correct route when Connect Platform action is clicked', async () => {
    const user = userEvent.setup();
    render(<QuickActions />);
    
    const connectPlatformCard = screen.getByText('Connect Platform').closest('div');
    await user.click(connectPlatformCard!);
    
    expect(mockNavigate).toHaveBeenCalledWith('/connections/new');
  });
  
  it('navigates to correct route when Settings action is clicked', async () => {
    const user = userEvent.setup();
    render(<QuickActions />);
    
    const settingsCard = screen.getByText('Settings').closest('div');
    await user.click(settingsCard!);
    
    expect(mockNavigate).toHaveBeenCalledWith('/settings');
  });
  
  it('applies special styling to primary action (Create Report)', () => {
    render(<QuickActions />);
    
    const createReportCard = screen.getByText('Create Report').closest('div');
    expect(createReportCard).toHaveClass('bg-blue-600');
    expect(createReportCard).toHaveClass('text-white');
    expect(createReportCard).toHaveClass('hover:bg-blue-700');
    
    // Other cards should have different styling
    const manageTemplatesCard = screen.getByText('Manage Templates').closest('div');
    expect(manageTemplatesCard).toHaveClass('bg-white');
    expect(manageTemplatesCard).toHaveClass('border');
    expect(manageTemplatesCard).toHaveClass('hover:border-blue-300');
  });
});
