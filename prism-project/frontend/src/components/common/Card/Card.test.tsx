// src/components/common/Card/Card.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from './Card';

describe('Card Component', () => {
  it('renders children correctly', () => {
    render(
      <Card>
        <p data-testid="card-content">Card content</p>
      </Card>
    );
    
    const content = screen.getByTestId('card-content');
    expect(content).toBeInTheDocument();
    expect(content).toHaveTextContent('Card content');
  });
  
  it('applies correct styling classes', () => {
    render(
      <Card>
        <p>Card content</p>
      </Card>
    );
    
    const card = screen.getByText('Card content').closest('div');
    expect(card).toHaveClass('rounded-xl');
    expect(card).toHaveClass('bg-white');
    expect(card).toHaveClass('shadow-lg');
    expect(card).toHaveClass('p-8');
  });
});