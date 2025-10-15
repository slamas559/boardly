// components/GoogleAuthButton.jsx
import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { FaGoogle } from 'react-icons/fa';
import axios from 'axios';
import api from '../utils/api';

const GoogleAuthButton = ({ 
  onSuccess, 
  onError, 
  role = null, 
  isLogin = false,
  disabled = false,
  className = ""
}) => {
  
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      // Exchange Google credential for access token
      const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
        code: credentialResponse.credential,
        client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
        client_secret: process.env.REACT_APP_GOOGLE_CLIENT_SECRET,
        grant_type: 'authorization_code',
        redirect_uri: window.location.origin
      });

      // Send the access token to your backend
      const response = await api.post('/auth/google', {
        token: tokenResponse.data.access_token,
        role: role
      });

      if (onSuccess) {
        onSuccess(response.data);
      }

    } catch (error) {
      console.error('Google authentication failed:', error);
      if (onError) {
        onError(error.response?.data?.message || 'Google authentication failed');
      }
    }
  };

  const handleGoogleError = () => {
    if (onError) {
      onError('Google authentication was cancelled or failed');
    }
  };

  return (
    <div className={`w-full ${className}`}>
      <GoogleLogin
        onSuccess={handleGoogleSuccess}
        onError={handleGoogleError}
        useOneTap={false}
        auto_select={false}
        shape="rectangular"
        size="large"
        width="100%"
        text={isLogin ? "signin_with" : "signup_with"}
        theme="outline"
        logo_alignment="left"
        disabled={disabled}
      />
    </div>
  );
};

// Alternative custom button if you prefer more control over styling
export const CustomGoogleButton = ({ 
  onClick, 
  disabled = false, 
  isLogin = false,
  className = ""
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-xl bg-white hover:bg-gray-50 text-gray-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <FaGoogle className="w-5 h-5 text-red-500" />
      {isLogin ? 'Sign in with Google' : 'Sign up with Google'}
    </button>
  );
};

export default GoogleAuthButton;