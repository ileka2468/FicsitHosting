import React, { useState, useEffect } from 'react';
import { Mail, Lock, User, ArrowRight, Github, Chrome, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { authService, UserInfo } from '../services/authService';
import { authApi } from '../services/api';

interface AuthPageProps {
  onLogin: (user: UserInfo) => void;
  onClose: () => void;
  onEmailVerified?: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLogin, onClose, onEmailVerified }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [registrationStep, setRegistrationStep] = useState<'form' | 'pending_verification' | 'verified'>('form');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState<string>('');
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  // Check if email verification happened (triggered from parent)
  useEffect(() => {
    if (onEmailVerified && registrationStep === 'pending_verification') {
      setRegistrationStep('verified');
      setTimeout(() => {
        onClose();
      }, 2000);
    }
  }, [onEmailVerified, registrationStep, onClose]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const validateForm = () => {
    if (!formData.email || !formData.password) {
      setError('Email and password are required');
      return false;
    }

    if (!isLogin) {
      if (!formData.name) {
        setError('Name is required for registration');
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return false;
      }
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters long');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      if (isLogin) {
        // Login
        const response = await authService.login({
          usernameOrEmail: formData.email,
          password: formData.password
        });
        onLogin(response.user);
      } else {
        // Register
        const [firstName, ...lastNameParts] = formData.name.split(' ');
        const lastName = lastNameParts.join(' ');
        
        await authService.register({
          username: formData.email.split('@')[0], // Use email prefix as username
          email: formData.email,
          password: formData.password,
          firstName: firstName || '',
          lastName: lastName || ''
        });
        
        // Set registration step to pending verification
        setRegisteredEmail(formData.email);
        setRegistrationStep('pending_verification');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = (provider: string) => {
    setError(`${provider} login is not yet implemented`);
  };

  const handleResendVerificationEmail = async () => {
    if (!registeredEmail) return;
    
    setIsResendingEmail(true);
    setError(null);
    setResendSuccess(false);
    
    try {
      await authApi.resendVerificationEmail(registeredEmail);
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 5000); // Hide success message after 5 seconds
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification email. Please try again.');
    } finally {
      setIsResendingEmail(false);
    }
  };

  const renderContent = () => {
    // Email verification pending view
    if (!isLogin && registrationStep === 'pending_verification') {
      return (
        <>
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-cyan-400" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Check Your Email</h2>
            <p className="text-white/70">
              We sent a verification link to<br />
              <span className="text-cyan-400 font-medium">{registeredEmail}</span>
            </p>
          </div>

          {/* Instructions */}
          <div className="space-y-4 mb-8">
            <div className="backdrop-blur-xl bg-white/10 rounded-xl p-4 border border-white/20">
              <p className="text-white/80 text-sm leading-relaxed">
                Click the verification link in your email to activate your account. 
                Once verified, you can return to this page and sign in.
              </p>
            </div>
            
            <div className="text-center">
              <p className="text-white/60 text-sm mb-3">Didn't receive the email?</p>
              {resendSuccess ? (
                <div className="text-green-400 text-sm mb-3">
                  ✓ Verification email sent successfully
                </div>
              ) : (
                <button
                  onClick={handleResendVerificationEmail}
                  disabled={isResendingEmail}
                  className="text-cyan-400 hover:text-cyan-300 text-sm transition-colors disabled:opacity-50 flex items-center justify-center space-x-2 mx-auto"
                >
                  {isResendingEmail ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <span>Resend verification email</span>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={() => {
                setIsLogin(true);
                setRegistrationStep('form');
                setError(null);
              }}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white py-3 rounded-xl font-semibold transition-all duration-300"
            >
              Go to Sign In
            </button>
            <button
              onClick={onClose}
              className="w-full text-white/70 hover:text-white text-sm transition-colors"
            >
              Close
            </button>
          </div>
        </>
      );
    }

    // Email verified view
    if (!isLogin && registrationStep === 'verified') {
      return (
        <>
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Email Verified!</h2>
            <p className="text-white/70">
              Your account has been successfully verified.<br />
              You can now sign in to your account.
            </p>
          </div>
          
          <div className="flex justify-center">
            <Loader className="w-6 h-6 text-cyan-400 animate-spin" />
          </div>
        </>
      );
    }

    // Default login/register form
    return (
      <>
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-white/70">
            {isLogin ? 'Sign in to manage your servers' : 'Join our hosting platform'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 backdrop-blur-xl bg-red-500/20 border border-red-500/30 rounded-xl flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span className="text-red-100 text-sm">{error}</span>
          </div>
        )}

        {/* Social Login */}
        <div className="space-y-3 mb-6">
          <button
            onClick={() => handleSocialLogin('Google')}
            disabled={isLoading}
            className="w-full flex items-center justify-center space-x-3 backdrop-blur-xl bg-white/15 hover:bg-white/25 border border-white/30 rounded-xl py-3 text-white transition-all duration-300 disabled:opacity-50"
          >
            <Chrome className="w-5 h-5" />
            <span>Continue with Google</span>
          </button>
          <button
            onClick={() => handleSocialLogin('GitHub')}
            disabled={isLoading}
            className="w-full flex items-center justify-center space-x-3 backdrop-blur-xl bg-white/15 hover:bg-white/25 border border-white/30 rounded-xl py-3 text-white transition-all duration-300 disabled:opacity-50"
          >
            <Github className="w-5 h-5" />
            <span>Continue with GitHub</span>
          </button>
        </div>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/20"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-transparent px-4 text-white/60">or continue with email</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-5 h-5" />
              <input
                type="text"
                name="name"
                placeholder="Full Name"
                value={formData.name}
                onChange={handleInputChange}
                required={!isLogin}
                className="w-full pl-12 pr-4 py-3 backdrop-blur-xl bg-white/15 border border-white/30 rounded-xl text-white placeholder-white/60 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30 focus:bg-white/20 transition-all"
              />
            </div>
          )}

          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-5 h-5" />
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleInputChange}
              required
              className="w-full pl-12 pr-4 py-3 backdrop-blur-xl bg-white/15 border border-white/30 rounded-xl text-white placeholder-white/60 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30 focus:bg-white/20 transition-all"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-5 h-5" />
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleInputChange}
              required
              className="w-full pl-12 pr-4 py-3 backdrop-blur-xl bg-white/15 border border-white/30 rounded-xl text-white placeholder-white/60 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30 focus:bg-white/20 transition-all"
            />
          </div>

          {!isLogin && (
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-5 h-5" />
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required={!isLogin}
                className="w-full pl-12 pr-4 py-3 backdrop-blur-xl bg-white/15 border border-white/30 rounded-xl text-white placeholder-white/60 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30 focus:bg-white/20 transition-all"
              />
            </div>
          )}

          {isLogin && (
            <div className="flex justify-end">
              <button
                type="button"
                className="text-cyan-400 hover:text-cyan-300 text-sm transition-colors"
              >
                Forgot password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white py-3 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        {/* Toggle */}
        <div className="text-center mt-6">
          <span className="text-white/70">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
          </span>
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
              setRegistrationStep('form');
              setFormData({
                email: '',
                password: '',
                name: '',
                confirmPassword: ''
              });
            }}
            className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </div>
      </>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="backdrop-blur-2xl bg-white/20 rounded-3xl p-8 border border-white/30 shadow-2xl max-w-md w-full relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {renderContent()}
      </div>
    </div>
  );
};
