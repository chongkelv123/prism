import React from 'react';
import AuthHeader from './AuthHeader';
import FormInput from '../../common/Input/FormInput';
import Checkbox from '../../common/Checkbox/Checkbox';
import ErrorAlert from '../../common/Alert/ErrorAlert';
import PrimaryButton from '../../common/Button/PrimaryButton';
import LinkButton from '../../common/Button/LinkButton';
import CenteredCard from '../../layout/CenteredCard';
import { useLoginForm } from '../../../features/auth/hooks/useLoginForm';

interface LoginFormProps {
  onLoginSuccess: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess }) => {
  const { formData, errors, isLoading, handleChange, handleSubmit } = useLoginForm(onLoginSuccess);

  return (
    <CenteredCard>
      <AuthHeader />
      {errors.general && <ErrorAlert message={errors.general} />}
      <form onSubmit={handleSubmit}>
        <FormInput
          label="Email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
          disabled={isLoading}
        />
        <FormInput
          label="Password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          error={errors.password}
          disabled={isLoading}
        />
        <Checkbox
          label="Remember me"
          checked={formData.remember}
          onChange={handleChange}
        />
        <PrimaryButton isLoading={isLoading} disabled={isLoading}>
          Sign in
        </PrimaryButton>
        <div className="mt-4 flex justify-between">
          <LinkButton to="/forgot-password">Forgot password?</LinkButton>
          <LinkButton to="/signup">Sign up</LinkButton>
        </div>
      </form>
    </CenteredCard>
  );
};

export default LoginForm;