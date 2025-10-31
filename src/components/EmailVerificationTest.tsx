import React from 'react';
import { Mail, ExternalLink, Copy } from 'lucide-react';

export const EmailVerificationTest: React.FC = () => {
  const testToken = 'test-verification-token-12345';
  const verificationUrl = `${window.location.origin}${window.location.pathname}?action=verify-email&token=${testToken}`;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(verificationUrl);
      alert('Verification URL copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleTestVerification = () => {
    // Simulate clicking an email verification link
    window.location.href = verificationUrl;
  };

  return (
    <div className="backdrop-blur-2xl bg-white/15 rounded-3xl p-6 border border-white/30 shadow-2xl max-w-md mx-auto">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Mail className="w-8 h-8 text-cyan-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Email Verification Test</h2>
        <p className="text-white/80 text-sm">
          Test the email verification flow with a sample token
        </p>
      </div>

      <div className="space-y-4">
        {/* Sample URL Display */}
        <div className="backdrop-blur-xl bg-white/10 rounded-lg p-3 border border-white/20">
          <div className="text-xs text-white/60 mb-2">Sample Verification URL:</div>
          <div className="text-xs text-white/80 break-all font-mono bg-black/20 p-2 rounded">
            {verificationUrl}
          </div>
        </div>

        {/* Test Actions */}
        <div className="space-y-3">
          <button
            onClick={handleTestVerification}
            className="w-full backdrop-blur-xl bg-gradient-to-r from-cyan-500/30 to-blue-500/30 hover:from-cyan-500/40 hover:to-blue-500/40 text-white rounded-2xl py-3 px-4 transition-all duration-300 border border-cyan-500/40 shadow-lg hover:shadow-cyan-400/25 flex items-center justify-center space-x-2"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Test Verification Flow</span>
          </button>

          <button
            onClick={handleCopyUrl}
            className="w-full backdrop-blur-xl bg-white/15 hover:bg-white/25 text-white rounded-2xl py-3 px-4 transition-all duration-300 border border-white/30 shadow-lg flex items-center justify-center space-x-2"
          >
            <Copy className="w-4 h-4" />
            <span>Copy Test URL</span>
          </button>
        </div>

        {/* Instructions */}
        <div className="text-xs text-white/60 space-y-1">
          <p><strong>How to test:</strong></p>
          <p>1. Click "Test Verification Flow" to simulate clicking an email link</p>
          <p>2. Or copy the URL and paste it in a new tab</p>
          <p>3. The verification modal should appear automatically</p>
        </div>
      </div>
    </div>
  );
};
