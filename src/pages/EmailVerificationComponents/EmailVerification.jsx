// EmailVerification.jsx - Component for handling verification link clicks
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FaSpinner, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { saveToken } from '../../utils/auth';
import api from '../../utils/api';

const EmailVerification = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('');
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');
      
      if (!token) {
        setStatus('error');
        setMessage('Invalid verification link');
        return;
      }

      try {
        const response = await api.get(`/auth/verify-email?token=${token}`);
        
        // Save token and user data
        saveToken(response.data.token);
        setUserData(response.data.user);
        setStatus('success');
        setMessage(response.data.message);
        
        // Redirect after 3 seconds
        setTimeout(() => {
          if (response.data.user.role === 'tutor') {
            navigate('/bank-setup');
          } else {
            navigate('/dashboard');
          }
          window.location.reload();
        }, 3000);
        
      } catch (error) {
        console.error('Email verification error:', error);
        setStatus('error');
        setMessage(error.response?.data?.message || 'Email verification failed');
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

  const renderContent = () => {
    switch (status) {
      case 'verifying':
        return (
          <>
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FaSpinner className="w-10 h-10 text-blue-600 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Verifying Your Email...
            </h2>
            <p className="text-gray-600">
              Please wait while we verify your email address.
            </p>
          </>
        );

      case 'success':
        return (
          <>
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FaCheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Email Verified Successfully! 🎉
            </h2>
            <div className="text-gray-600 mb-6 space-y-2">
              <p>{message}</p>
              {userData && (
                <p>
                  Welcome, <span className="font-semibold text-green-600">{userData.name}</span>!
                </p>
              )}
              <p className="text-sm">
                Redirecting you to your dashboard in a few seconds...
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-green-600">
              <FaSpinner className="w-4 h-4 animate-spin" />
              <span>Redirecting...</span>
            </div>
          </>
        );

      case 'error':
        return (
          <>
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FaExclamationTriangle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Verification Failed
            </h2>
            <div className="text-gray-600 mb-6 space-y-2">
              <p>{message}</p>
              <p className="text-sm">
                The verification link may have expired or is invalid.
              </p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/register')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                Back to Registration
              </button>
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                Go to Login
              </button>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
        {renderContent()}
      </div>
    </div>
  );
};

export default EmailVerification;