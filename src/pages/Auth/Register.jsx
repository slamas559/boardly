import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FaUser, FaEnvelope, FaLock, FaInfoCircle, FaUpload, FaEye, FaEyeSlash, FaUserTie, FaGraduationCap, FaGoogle, FaCheck } from "react-icons/fa";
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import api from "../../utils/api";
import EmailVerificationRequired from "../EmailVerificationComponents/EmailVerificationRequired";

const Register = () => {
  const [form, setForm] = useState({ 
    name: "", 
    email: "", 
    password: "", 
    bio: "",
    role: "student"
  });
  const [avatar, setAvatar] = useState(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  const navigate = useNavigate();
  const client_id = import.meta.env.VITE_APP_GOOGLE_CLIENT_ID;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = new FormData();
      data.append("name", form.name);
      data.append("email", form.email);
      data.append("password", form.password);
      data.append("bio", form.bio);
      data.append("role", form.role);
      if (avatar) {
        data.append("avatar", avatar);
      }

      const res = await api.post("/auth/register", data);
      
      if (res.data.verificationSent) {
        setRegistrationSuccess(true);
        setUserEmail(res.data.email);
      } else {
        if (form.role === 'tutor') {
          navigate("/bank-setup");
        } else {
          navigate("/dashboard");
        }
        window.location.reload();
      }
      
    } catch (err) {
      console.error("Registration error:", err);
      setError(err.response?.data?.message || "Registration failed. Please try again.");
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
        context: "register",
        role: form.role,
        userInfo: {
          email: decoded.email,
          name: decoded.name,
          picture: decoded.picture,
          googleId: decoded.sub
        }
      });
      
      if (res.data.user.role === 'tutor') {
        navigate("/bank-setup");
      } else {
        navigate("/lobby");
      }
      
      window.location.reload();
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
  };

  const handleRoleSelect = (role) => {
    setForm({
      ...form,
      role
    });
  };

  if (registrationSuccess) {
    return (
      <EmailVerificationRequired 
        email={userEmail}
        onResendSuccess={() => {
          // Optional: show success message or update state
        }}
      />
    );
  }

  return (
    <GoogleOAuthProvider clientId={client_id}>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-lg w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gray-900 rounded-lg flex items-center justify-center mx-auto mb-4">
              <FaUser className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h1>
            <p className="text-gray-600">Join our professional teaching platform</p>
          </div>

          {/* Registration Card */}
          <div className="bg-white p-8 border border-gray-200 rounded-lg shadow-sm">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
                {error}
              </div>
            )}

            {/* Role Selection */}
            <div className="mb-8">
              <label className="block text-sm font-semibold text-gray-900 mb-4">
                Account Type <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => handleRoleSelect('student')}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    form.role === 'student'
                      ? 'border-gray-900 bg-gray-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <FaGraduationCap className={`w-6 h-6 mb-3 ${
                    form.role === 'student' ? 'text-gray-900' : 'text-gray-400'
                  }`} />
                  <div className="font-semibold text-gray-900">Student</div>
                  <div className="text-sm text-gray-600 mt-1">Access learning sessions</div>
                </button>
                
                <button
                  type="button"
                  onClick={() => handleRoleSelect('tutor')}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    form.role === 'tutor'
                      ? 'border-gray-900 bg-gray-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <FaUserTie className={`w-6 h-6 mb-3 ${
                    form.role === 'tutor' ? 'text-gray-900' : 'text-gray-400'
                  }`} />
                  <div className="font-semibold text-gray-900">Instructor</div>
                  <div className="text-sm text-gray-600 mt-1">Teach and earn revenue</div>
                </button>
              </div>
              
              {/* Role-specific info */}
              {form.role === 'tutor' && (
                <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <FaCheck className="w-4 h-4 text-gray-600 mt-0.5" />
                    <p className="text-sm text-gray-700">
                      Instructors receive 70% of all session payments. Bank account setup required after registration.
                    </p>
                  </div>
                </div>
              )}
              
              {form.role === 'student' && (
                <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <FaCheck className="w-4 h-4 text-gray-600 mt-0.5" />
                    <p className="text-sm text-gray-700">
                      Access free sessions instantly or pay for premium instructor-led sessions.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Google Sign Up Button */}
            <div className="mb-6">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                useOneTap={false}
                auto_select={false}
                shape="rectangular"
                size="large"
                width="100%"
                text="signup_with"
                theme="outline"
                logo_alignment="left"
                disabled={loading || googleLoading}
              />
            </div>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or create account with email</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FaUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    name="name"
                    type="text"
                    required
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all"
                    placeholder={form.role === 'tutor' ? 'Enter your professional name' : 'Enter your full name'}
                    value={form.name}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              {/* Email Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FaEnvelope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    name="email"
                    type="email"
                    required
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all"
                    placeholder="Enter your email address"
                    value={form.email}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength="6"
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all"
                    placeholder="Create a secure password"
                    value={form.password}
                    onChange={handleInputChange}
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
                <p className="text-xs text-gray-500 mt-2">Must be at least 6 characters long</p>
              </div>

              {/* Bio Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  {form.role === 'tutor' ? 'Professional Bio' : 'Bio'} 
                  {form.role === 'tutor' && <span className="text-red-500 ml-1">*</span>}
                </label>
                <div className="relative">
                  <FaInfoCircle className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                  <textarea
                    name="bio"
                    rows="4"
                    required={form.role === 'tutor'}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-all resize-none"
                    placeholder={
                      form.role === 'tutor' 
                        ? 'Describe your expertise, teaching experience, and qualifications...' 
                        : 'Tell us about yourself and your learning goals (optional)...'
                    }
                    value={form.bio}
                    onChange={handleInputChange}
                  />
                </div>
                {form.role === 'tutor' && (
                  <p className="text-xs text-gray-500 mt-2">
                    This information will be visible to students when they view your sessions
                  </p>
                )}
              </div>

              {/* Avatar Upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Profile Picture {form.role === 'tutor' && <span className="text-gray-500">(Recommended)</span>}
                </label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <FaUpload className="w-8 h-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600 text-center px-2">
                        {avatar ? avatar.name : (
                          form.role === 'tutor' 
                            ? "Upload a professional photo"
                            : "Click to upload profile picture"
                        )}
                      </p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setAvatar(e.target.files[0])}
                    />
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full bg-gray-900 text-white font-semibold py-3 rounded-md hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Creating Account...
                  </div>
                ) : (
                  `Create ${form.role === 'tutor' ? 'Instructor' : 'Student'} Account`
                )}
              </button>
            </form>

            {/* Additional Info for Tutors */}
            {form.role === 'tutor' && (
              <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Next Steps</h4>
                <p className="text-sm text-gray-600">
                  After registration, you'll be guided through setting up your bank account 
                  to receive payments from your teaching sessions.
                </p>
              </div>
            )}

            {/* Login Link */}
            <div className="text-center mt-6 pt-6 border-t border-gray-200">
              <p className="text-gray-600">
                Already have an account?{" "}
                <button
                  onClick={() => navigate("/login")}
                  className="text-gray-900 hover:text-gray-700 font-semibold"
                >
                  Sign in here
                </button>
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-6">
            <p className="text-sm text-gray-500">
              By creating an account, you agree to our{" "}
              <button className="text-gray-700 hover:text-gray-900">Terms of Service</button> and{" "}
              <button className="text-gray-700 hover:text-gray-900">Privacy Policy</button>
            </p>
          </div>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
};

export default Register;