// src/components/feature-specific/dashboard/DashboardSection.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DashboardSection from './DashboardSection';

describe('DashboardSection Component', () => {
  it('renders with title correctly', () => {
    render(<DashboardSection title="Test Section" />);
    
    expect(screen.getByText('Test Section')).toBeInTheDocument();
  });
  
  it('renders children when provided', () => {
    render(
      <DashboardSection title="Test Section">
        <p data-testid="test-content">Test Content</p>
      </DashboardSection>
    );
    
    expect(screen.getByTestId('test-content')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });
  
  it('displays "No data" when no children are provided', () => {
    render(<DashboardSection title="Test Section" />);
    
    expect(screen.getByText('No data')).toBeInTheDocument();
  });
  
  it('renders action button when actionText is provided', () => {
    const mockAction = vi.fn();
    render(
      <DashboardSection 
        title="Test Section" 
        actionText="View All" 
        onAction={mockAction}
      />
    );
    
    const actionButton = screen.getByText('View All');
    expect(actionButton).toBeInTheDocument();
  });
  
  it('calls onAction when action button is clicked', async () => {
    const mockAction = vi.fn();
    const user = userEvent.setup();
    
    render(
      <DashboardSection 
        title="Test Section" 
        actionText="View All" 
        onAction={mockAction}
      />
    );
    
    const actionButton = screen.getByText('View All');
    await user.click(actionButton);
    
    expect(mockAction).toHaveBeenCalledTimes(1);
  });
  
  it('does not render action button when actionText is not provided', () => {
    const mockAction = vi.fn();
    render(
      <DashboardSection 
        title="Test Section" 
        onAction={mockAction}
      />
    );
    
    // Try to find an action button - should not exist
    const actionButtons = screen.queryAllByRole('button');
    expect(actionButtons.length).toBe(0);
  });
  
  it('applies correct styling', () => {
    render(<DashboardSection title="Test Section" />);
    
    const title = screen.getByText('Test Section');
    const section = title.closest('div');
    const header = title.closest('div');
    
    expect(section).toHaveClass('bg-white');
    expect(section).toHaveClass('rounded-lg');
    expect(section).toHaveClass('shadow-sm');
    expect(section).toHaveClass('mb-8');
    expect(header).toHaveClass('px-6');
    expect(header).toHaveClass('py-4');
    expect(header).toHaveClass('border-b');
  });
});