import { useState } from "react";
import axios from "axios";
import { useNavigate, Link, useLocation, useSearchParams } from "react-router-dom";
import { saveToken } from "../../utils/auth";
import api from "../../utils/api";
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import boardlyIcon from '../../assets/boardly-icon.svg';
import {
  FaEnvelope,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaSignInAlt,
  FaGoogle,
  FaGithub,
  FaGraduationCap
} from "react-icons/fa";

const Login = () => {
  const [form, setForm] = useState({
    email: "",
    password: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/dashboard';

  const client_id = import.meta.env.VITE_APP_GOOGLE_CLIENT_ID;

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!form.email || !form.password) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    try {
      const res = await api.post("/auth/login", {
        email: form.email,
        password: form.password
      });
      
      saveToken(res.data.token);
      window.location.href = redirectPath;
      
    } catch (err) {
      console.error("Login error:", err);
      if (err.response?.status === 403 && err.response?.data?.emailVerified === false) {
        setUnverifiedEmail(err.response.data.email || form.email);
        setShowEmailVerification(true);
        return;
      }
      setError(
        err.response?.data?.message || 
        "Login failed. Please check your credentials and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setGoogleLoading(true);
    setError("");

    try {
      const decoded = JSON.parse(atob(credentialResponse.credential.split('.')[1]));
      
      const res = await api.post("/auth/google", {
        credential: credentialResponse.credential,
        context: "login",
        userInfo: {
          email: decoded.email,
          name: decoded.name,
          picture: decoded.picture,
          googleId: decoded.sub
        }
      });

      saveToken(res.data.token);
      window.location.href = redirectPath;
      
    } catch (err) {
      console.error("Google authentication error:", err);
      setError(err.response?.data?.message || "Google authentication failed. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError("Google authentication was cancelled or failed");
    setGoogleLoading(false);
  };

  const handleInputChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
    if (error) setError("");
  };

  return (
    <GoogleOAuthProvider clientId={client_id}>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <Link to="/" className="inline-flex items-center gap-2 mb-8">
              <img src={boardlyIcon} alt="Boardly" className="h-7 w-7" />
              <span className="font-semibold text-2xl text-gray-900">
                Boardly
              </span>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Sign In</h1>
            <p className="text-gray-600">Access your professional teaching account</p>
          </div>

          {/* Login Card */}
          <div className="bg-white p-8 border border-gray-200 rounded-lg shadow-sm">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
              {/* Email Input */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <FaEnvelope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all"
                    placeholder="Enter your email address"
                    value={form.email}
                    onChange={handleInputChange}
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-900 mb-2">
                  Password
                </label>
                <div className="relative">
                  <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all"
                    placeholder="Enter your password"
                    value={form.password}
                    onChange={handleInputChange}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    {showPassword ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-gray-900 focus:ring-gray-900 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-600">Remember me</span>
                </label>
                
                <button
                  type="button"
                  className="text-sm text-gray-700 hover:text-gray-900 font-medium"
                  onClick={() => navigate("/forgot-password")}
                >
                  Forgot password?
                </button>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gray-900 text-white font-semibold py-3 rounded-md hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Signing in...
                  </div>
                ) : (
                  <>
                    <FaSignInAlt className="w-4 h-4" />
                    Sign In
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>

            {/* Google Login */}
            <div className="mb-6">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                useOneTap={false}
                auto_select={false}
                shape="rectangular"
                size="large"
                width="100%"
                text="signin_with"
                theme="outline"
                logo_alignment="left"
                disabled={loading || googleLoading}
              />
            </div>

            {/* Sign Up Link */}
            <div className="text-center pt-6 border-t border-gray-200">
              <p className="text-gray-600">
                Don't have an account?{" "}
                <Link
                  to="/register"
                  className="text-gray-900 hover:text-gray-700 font-semibold"
                >
                  Create account
                </Link>
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center">
            <p className="text-sm text-gray-500">
              By signing in, you agree to our{" "}
              <button className="text-gray-700 hover:text-gray-900">Terms of Service</button> and{" "}
              <button className="text-gray-700 hover:text-gray-900">Privacy Policy</button>
            </p>
          </div>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
};

export default Login;