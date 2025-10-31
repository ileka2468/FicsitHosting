import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, XCircle, Loader, ArrowRight } from 'lucide-react';
import { authApi, ApiError } from '../services/api';
import { UserInfo } from '../services/authService';

interface EmailVerificationProps {
  token: string;
  onClose: () => void;
  onLoginRedirect: () => void;
  onVerificationComplete?: () => void; // New callback when verification succeeds
  onAutoLogin?: (user: UserInfo) => void; // New callback for auto-login after verification
}

export const EmailVerification: React.FC<EmailVerificationProps> = ({ 
  token, 
  onClose, 
  onLoginRedirect,
  onVerificationComplete,
  onAutoLogin
}) => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [isAutoLoggedIn, setIsAutoLoggedIn] = useState(false);
  const verificationAttempted = useRef(false);
  const verificationInProgress = useRef(false);

  useEffect(() => {
    const verifyEmail = async () => {
      // Create a unique key for this verification token
      const verificationKey = `email_verification_${token}`;
      
      // Check if this token has already been processed in this session
      if (sessionStorage.getItem(verificationKey)) {
        console.log('This token has already been processed in this session');
        setStatus('success');
        setMessage('Email verification already completed!');
        setIsAutoLoggedIn(true);
        setTimeout(() => {
          onClose();
        }, 1500);
        return;
      }
      
      // Prevent multiple verification attempts across component remounts
      if (verificationAttempted.current || verificationInProgress.current) {
        console.log('Email verification already attempted or in progress, skipping...');
        return;
      }
      
      // Check if we already have stored tokens (might have been verified in another tab/session)
      const existingToken = localStorage.getItem('satisfactory_auth_token');
      if (existingToken) {
        console.log('User already has auth token, skipping verification');
        setStatus('success');
        setMessage('You are already logged in!');
        setIsAutoLoggedIn(true);
        setTimeout(() => {
          onClose();
        }, 1500);
        return;
      }
      
      verificationAttempted.current = true;
      verificationInProgress.current = true;
      
      try {
        setStatus('loading');
        console.log('Starting email verification for token:', token);
        
        // Mark this token as being processed
        sessionStorage.setItem(verificationKey, 'processing');
        
        const response = await authApi.verifyEmail(token);
        
        console.log('Email verification response:', response);
        
        // Check if response contains authentication tokens (auto-login)
        if ('accessToken' in response && 'user' in response && onAutoLogin) {
          console.log('Auto-login detected, user:', response.user);
          setStatus('success');
          setMessage('Email verified successfully! You are now logged in.');
          setIsAutoLoggedIn(true);
          
          // Mark this token as successfully processed
          sessionStorage.setItem(verificationKey, 'completed');
          
          // Auto-login the user
          onAutoLogin(response.user);
          
          // Notify parent that verification is complete
          if (onVerificationComplete) {
            onVerificationComplete();
          }
          
          // Auto-close modal after successful login
          setTimeout(() => {
            onClose();
          }, 2000);
          
        } else if ('message' in response) {
          // Fallback to old message-based response
          console.log('Message-based response:', response.message);
          setStatus('success');
          setMessage(response.message || 'Email verified successfully!');
          setIsAutoLoggedIn(false);
          
          // Mark this token as successfully processed
          sessionStorage.setItem(verificationKey, 'completed');
          
          // Notify parent that verification is complete
          if (onVerificationComplete) {
            onVerificationComplete();
          }
        } else {
          console.log('Unexpected response format:', response);
          setStatus('success');
          setMessage('Email verified successfully!');
          setIsAutoLoggedIn(false);
          
          // Mark this token as successfully processed
          sessionStorage.setItem(verificationKey, 'completed');
        }
      } catch (error) {
        console.error('Email verification error:', error);
        
        // Remove the processing marker on error so user can retry if needed
        sessionStorage.removeItem(verificationKey);
        
        setStatus('error');
        if (error instanceof ApiError) {
          setMessage(error.message);
        } else {
          setMessage('Email verification failed. Please try again.');
        }
      } finally {
        verificationInProgress.current = false;
      }
    };

    if (token && !verificationAttempted.current) {
      verifyEmail();
    } else if (!token) {
      setStatus('error');
      setMessage('No verification token provided.');
    }
  }, [token, onVerificationComplete, onAutoLogin, onClose]);

  const handleLoginRedirect = () => {
    onClose();
    onLoginRedirect();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md backdrop-blur-2xl bg-white/15 rounded-3xl p-6 border border-white/30 shadow-2xl">
        <div className="text-center">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            {status === 'loading' && (
              <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center">
                <Loader className="w-8 h-8 text-cyan-400 animate-spin" />
              </div>
            )}
            {status === 'success' && (
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            )}
            {status === 'error' && (
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-400" />
              </div>
            )}
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-white mb-2">
            {status === 'loading' && 'Verifying Email...'}
            {status === 'success' && 'Email Verified!'}
            {status === 'error' && 'Verification Failed'}
          </h2>

          {/* Message */}
          <p className="text-white/80 mb-6 leading-relaxed">
            {status === 'loading' && 'Please wait while we verify your email address.'}
            {status === 'success' && message}
            {status === 'error' && message}
          </p>

          {/* Actions */}
          {status === 'success' && (
            <div className="space-y-3">
              {!isAutoLoggedIn && (
                <button
                  onClick={handleLoginRedirect}
                  className="w-full backdrop-blur-xl bg-gradient-to-r from-cyan-500/30 to-blue-500/30 hover:from-cyan-500/40 hover:to-blue-500/40 text-white rounded-2xl py-3 px-6 transition-all duration-300 border border-cyan-500/40 shadow-lg hover:shadow-cyan-400/25 flex items-center justify-center space-x-2"
                >
                  <span className="font-medium">Sign In to Your Account</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={onClose}
                className="w-full text-white/70 hover:text-white text-sm transition-colors"
              >
                {isAutoLoggedIn ? 'Continue' : 'Close'}
              </button>
              {isAutoLoggedIn && (
                <p className="text-white/60 text-xs text-center">
                  You can now close this window and return to the previous tab.
                </p>
              )}
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-3">
              <button
                onClick={onClose}
                className="w-full backdrop-blur-xl bg-white/15 hover:bg-white/25 text-white rounded-2xl py-3 px-6 transition-all duration-300 border border-white/30 shadow-lg"
              >
                Close
              </button>
              <p className="text-white/60 text-xs">
                Need help? Contact support or try requesting a new verification email.
              </p>
            </div>
          )}

          {status === 'loading' && (
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white text-sm transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
