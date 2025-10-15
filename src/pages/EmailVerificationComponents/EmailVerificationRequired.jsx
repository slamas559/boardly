// EmailVerificationRequired.jsx - Component shown when email verification is needed
import { useState } from 'react';
import { FaEnvelope, FaSpinner, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import api from '../../utils/api';

const EmailVerificationRequired = ({ email, onResendSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'error'

  const handleResendVerification = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      await api.post('/auth/resend-verification', { email });
      setMessage('Verification email sent successfully! Please check your inbox.');
      setMessageType('success');
      if (onResendSuccess) onResendSuccess();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Failed to resend verification email');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
        {/* Icon */}
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <FaEnvelope className="w-10 h-10 text-blue-600" />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Verify Your Email
        </h2>

        {/* Description */}
        <div className="text-gray-600 mb-6 space-y-2">
          <p>We've sent a verification link to:</p>
          <p className="font-semibold text-blue-600 break-all">{email}</p>
          <p className="text-sm">
            Please check your inbox and click the verification link to complete your registration.
          </p>
        </div>

        {/* Status Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
            messageType === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {messageType === 'success' ? (
              <FaCheckCircle className="w-4 h-4 flex-shrink-0" />
            ) : (
              <FaExclamationTriangle className="w-4 h-4 flex-shrink-0" />
            )}
            <span className="text-sm">{message}</span>
          </div>
        )}

        {/* Resend Button */}
        <button
          onClick={handleResendVerification}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <FaSpinner className="w-4 h-4 animate-spin" />
              Sending...
            </>
          ) : (
            'Resend Verification Email'
          )}
        </button>

        {/* Additional Help */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
          <p className="font-semibold mb-2">Don't see the email?</p>
          <ul className="text-left space-y-1">
            <li>• Check your spam/junk folder</li>
            <li>• Make sure you entered the correct email</li>
            <li>• Wait a few minutes and try resending</li>
          </ul>
        </div>

        {/* Support Link */}
        <div className="mt-4">
          <p className="text-xs text-gray-500">
            Need help? Contact our support team at{' '}
            <a href="mailto:support@boardly.com" className="text-blue-600 hover:text-blue-700">
              support@boardly.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationRequired;