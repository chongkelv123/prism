import React from 'react';
import { Card } from '../../components/common/Card/Card';
import { Input } from '../../components/common/Input/Input';
import { Button } from '../../components/common/Button/Button';
import ErrorAlert from '../common/Alert/ErrorAlert';
import { useRegistrationForm } from '../../features/auth/hooks/useRegistrationForm';

export const RegistrationForm: React.FC = () => {
  const { formData, errors, isSubmitting, handleChange, handleSubmit } = useRegistrationForm();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <Card>
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Create an Account</h2>
            <p className="mt-2 text-gray-600">Fill in your details to get started</p>
          </div>
          
          {errors.general && <ErrorAlert message={errors.general} />}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                id="firstName"
                name="firstName"
                label="First Name"
                value={formData.firstName}
                onChange={handleChange}
                error={errors.firstName}
                required
                disabled={isSubmitting}
              />
              <Input
                id="lastName"
                name="lastName"
                label="Last Name"
                value={formData.lastName}
                onChange={handleChange}
                error={errors.lastName}
                required
                disabled={isSubmitting}
              />
            </div>
            <Input
              id="email"
              name="email"
              type="email"
              label="Email Address"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              required
              disabled={isSubmitting}
            />
            <Input
              id="password"
              name="password"
              type="password"
              label="Password"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              required
              disabled={isSubmitting}
            />
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              label="Confirm Password"
              value={formData.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
              required
              disabled={isSubmitting}
            />
            <Button type="submit" isLoading={isSubmitting}>
              Create Account
            </Button>
            
            <div className="text-center mt-4">
              <p className="text-gray-600">
                Already have an account?{' '}
                <a href="/login" className="text-blue-600 hover:underline">
                  Sign in
                </a>
              </p>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};