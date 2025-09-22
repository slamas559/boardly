// pages/Profile.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { getToken, isLogout } from '../utils/auth';
import api from '../utils/api';
import {
  FaUser,
  FaEnvelope,
  FaCamera,
  FaSave,
  FaTimes,
  FaTrash,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaCalendar,
  FaArrowLeft,
  FaUniversity,
  FaCreditCard,
  FaCheckCircle,
  FaExclamationTriangle,
  FaEdit,
  FaDollarSign
} from 'react-icons/fa';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [banks, setBanks] = useState([]);
  const [showBankSetup, setShowBankSetup] = useState(false);
  const [bankForm, setBankForm] = useState({
    bankCode: '',
    accountNumber: '',
    accountName: ''
  });
  const [resolvingAccount, setResolvingAccount] = useState(false);
  const [settingUpBank, setSettingUpBank] = useState(false);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    email: '',
    bio: '',
    currentPassword: '',
    newPassword: ''
  });

  useEffect(() => {
    fetchProfile();
    // if (user?.role === 'tutor') {
      fetchBanks();
    // }
  }, []);

  const fetchBanks = async () => {
    try {
      const res = await api.get("/auth/banks");
      setBanks(res.data.banks);
    } catch (err) {
      console.error('Error fetching banks:', err);
    }
  };

  const fetchProfile = async () => {
    try {
      const token = getToken();
      const res = await api.get("/auth/profile", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(res.data);
      setForm({
        name: res.data.name || '',
        email: res.data.email || '',
        bio: res.data.bio || '',
        currentPassword: '',
        newPassword: ''
      });
      if (res.data.avatar) {
        setAvatarPreview(res.data.avatar);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
    // Clear messages when user starts typing
    if (error) setError('');
    if (success) setSuccess('');
  };

  const handleBankFormChange = (e) => {
    setBankForm({
      ...bankForm,
      [e.target.name]: e.target.value
    });
    
    // Clear account name if bank or account number changes
    if (e.target.name === 'bankCode' || e.target.name === 'accountNumber') {
      setBankForm(prev => ({ ...prev, accountName: '' }));
    }
  };

  const resolveAccount = async () => {
    if (!bankForm.bankCode || !bankForm.accountNumber) {
      setError('Please select a bank and enter account number');
      return;
    }

    if (bankForm.accountNumber.length !== 10) {
      setError('Account number must be 10 digits');
      return;
    }

    setResolvingAccount(true);
    try {
      const token = getToken();
      const res = await api.post('/auth/resolve-account', {
        bankCode: bankForm.bankCode,
        accountNumber: bankForm.accountNumber
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        setBankForm(prev => ({ ...prev, accountName: res.data.accountName }));
        setSuccess('Account resolved successfully!');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resolve account');
    } finally {
      setResolvingAccount(false);
    }
  };

  const handleBankSetup = async (e) => {
    e.preventDefault();
    if (!bankForm.accountName) {
      setError('Please resolve your account first');
      return;
    }

    setSettingUpBank(true);
    try {
      const token = getToken();
      const res = await api.post('/auth/setup-bank', {
        bankCode: bankForm.bankCode,
        accountNumber: bankForm.accountNumber
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        setSuccess('Bank account setup successful!');
        setShowBankSetup(false);
        fetchProfile(); // Refresh user data
        setBankForm({ bankCode: '', accountNumber: '', accountName: '' });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to setup bank account');
    } finally {
      setSettingUpBank(false);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const token = getToken();
      const data = new FormData();
      
      data.append('name', form.name);
      data.append('bio', form.bio);
      
      if (form.currentPassword && form.newPassword) {
        data.append('currentPassword', form.currentPassword);
        data.append('newPassword', form.newPassword);
      }

      // Add avatar file if a new one was selected
      const avatarInput = document.querySelector('input[name="avatar"]');
      if (avatarInput?.files[0]) {
        data.append('avatar', avatarInput.files[0]);
      }

      const res = await api.put("/auth/profile", data, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      setSuccess('Profile updated successfully!');
      setUser(res.data.user);
      
      // Reset password fields
      setForm(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: ''
      }));
      setShowPasswordFields(false);

    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    try {
      const token = getToken();
      await api.delete("/auth/profile",
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      isLogout();
      navigate('/');
      alert('Your account has been deleted successfully.');
    } catch (err) {
      console.error('Error deleting account:', err);
      setError('Failed to delete account');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount / 100); // Convert from kobo to naira
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors mb-6 font-medium"
          >
            <FaArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Profile Settings</h1>
          <p className="text-gray-600">Manage your account information and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm p-6">
              {/* Messages */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                  {error}
                </div>
              )}
              
              {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
                  {success}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Avatar Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Profile Picture
                  </label>
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
                        {avatarPreview ? (
                          <img
                            src={avatarPreview}
                            alt="Profile"
                            className="w-20 h-20 rounded-full object-cover"
                          />
                        ) : (
                          <FaUser className="w-8 h-8" />
                        )}
                      </div>
                      <label className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-md cursor-pointer hover:bg-gray-50 transition-colors">
                        <FaCamera className="w-4 h-4 text-gray-600" />
                        <input
                          type="file"
                          name="avatar"
                          accept="image/*"
                          className="hidden"
                          onChange={handleAvatarChange}
                        />
                      </label>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Recommended: 500x500px, JPG, PNG or WEBP</p>
                    </div>
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={form.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Enter your full name"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <div className="relative">
                    <FaEnvelope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      disabled
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-500"
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Email cannot be changed</p>
                </div>

                {/* Bio */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bio
                  </label>
                  <textarea
                    name="bio"
                    rows="4"
                    value={form.bio}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none"
                    placeholder="Tell us about yourself..."
                  />
                </div>

                {/* Password Change Section */}
                <div className="border-t pt-6 mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Password</h3>
                    <button
                      type="button"
                      onClick={() => setShowPasswordFields(!showPasswordFields)}
                      className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                    >
                      {showPasswordFields ? 'Cancel' : 'Change Password'}
                    </button>
                  </div>

                  {showPasswordFields && (
                    <div className="space-y-4 bg-gray-50 p-4 rounded-xl">
                      {/* Current Password */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Current Password
                        </label>
                        <div className="relative">
                          <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <input
                            type={showCurrentPassword ? "text" : "password"}
                            name="currentPassword"
                            value={form.currentPassword}
                            onChange={handleInputChange}
                            className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            placeholder="Enter current password"
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          >
                            {showCurrentPassword ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* New Password */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          New Password
                        </label>
                        <div className="relative">
                          <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                          <input
                            type={showNewPassword ? "text" : "password"}
                            name="newPassword"
                            value={form.newPassword}
                            onChange={handleInputChange}
                            className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            placeholder="Enter new password"
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                          >
                            {showNewPassword ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Save Button */}
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Saving...
                    </div>
                  ) : (
                    <>
                      <FaSave className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Bank Details Section for Tutors */}
            {user?.role === 'tutor' && (
              <div className="bg-white rounded-2xl shadow-sm p-6 mt-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Bank Details</h3>
                    <p className="text-sm text-gray-600">Manage your payment information</p>
                  </div>
                  {user.bankDetails?.isVerified && (
                    <div className="flex items-center gap-2 text-green-600">
                      <FaCheckCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">Verified</span>
                    </div>
                  )}
                </div>

                {user.bankDetails?.isVerified ? (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <FaUniversity className="w-5 h-5 text-green-600 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-medium text-green-900">{user.bankDetails.accountName}</h4>
                          <p className="text-sm text-green-700">
                            {banks.find(bank => bank.code === user.bankDetails.bankCode)?.name || 'Bank'}
                          </p>
                          <p className="text-sm text-green-600 font-mono">
                            {user.bankDetails.accountNumber}
                          </p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowBankSetup(true)}
                      className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-2"
                    >
                      <FaEdit className="w-4 h-4" />
                      Update Bank Details
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <FaExclamationTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-yellow-900">Bank Account Required</h4>
                          <p className="text-sm text-yellow-700">
                            Set up your bank account to receive payments from students.
                          </p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowBankSetup(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                      <FaUniversity className="w-4 h-4" />
                      Setup Bank Account
                    </button>
                  </div>
                )}

                {/* Bank Setup Modal/Form */}
                {showBankSetup && (
                  <div className="mt-6 border-t pt-6">
                    <form onSubmit={handleBankSetup} className="space-y-4">
                      <h4 className="font-medium text-gray-900 mb-4">
                        {user.bankDetails?.isVerified ? 'Update Bank Details' : 'Setup Bank Account'}
                      </h4>
                      
                      {/* Bank Selection */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select Bank
                        </label>
                        <select
                          name="bankCode"
                          value={bankForm.bankCode}
                          onChange={handleBankFormChange}
                          required
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Select your bank</option>
                          {banks.map((bank) => (
                            <option key={`${bank.code}-${bank.name}`} value={bank.code}>
                              {bank.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Account Number */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Account Number
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            name="accountNumber"
                            value={bankForm.accountNumber}
                            onChange={handleBankFormChange}
                            placeholder="Enter 10-digit account number"
                            maxLength="10"
                            required
                            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <button
                            type="button"
                            onClick={resolveAccount}
                            disabled={resolvingAccount || !bankForm.bankCode || bankForm.accountNumber.length !== 10}
                            className="px-4 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {resolvingAccount ? 'Resolving...' : 'Verify'}
                          </button>
                        </div>
                      </div>

                      {/* Account Name */}
                      {bankForm.accountName && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Account Name
                          </label>
                          <input
                            type="text"
                            value={bankForm.accountName}
                            disabled
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-gray-50 text-gray-600"
                          />
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-3 pt-4">
                        <button
                          type="submit"
                          disabled={settingUpBank || !bankForm.accountName}
                          className="flex-1 bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {settingUpBank ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Setting up...
                            </>
                          ) : (
                            <>
                              <FaSave className="w-4 h-4" />
                              Save Bank Details
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowBankSetup(false);
                            setBankForm({ bankCode: '', accountNumber: '', accountName: '' });
                          }}
                          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Account Info */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <FaEnvelope className="w-4 h-4" />
                  <span>{user.email}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <FaCalendar className="w-4 h-4" />
                  <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <FaUser className="w-4 h-4" />
                  <span className="capitalize">{user.role}</span>
                </div>
              </div>
            </div>

            {/* Payment Status for Tutors */}
            {user?.role === 'tutor' && (
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Status</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    {user.hasPaymentSetup ? (
                      <>
                        <FaCheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-green-600">Payment setup complete</span>
                      </>
                    ) : (
                      <>
                        <FaExclamationTriangle className="w-4 h-4 text-yellow-600" />
                        <span className="text-yellow-600">Payment setup required</span>
                      </>
                    )}
                  </div>
                  {user.paystackSubaccountCode && (
                    <div className="text-xs text-gray-500">
                      Subaccount: {user.paystackSubaccountCode}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Danger Zone */}
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-red-900 mb-4">Danger Zone</h3>
              <p className="text-red-700 text-sm mb-4">
                Once you delete your account, there is no going back. Please be certain.
              </p>
              <button
                onClick={handleDeleteAccount}
                className="w-full bg-red-600 text-white font-semibold py-2.5 rounded-xl hover:bg-red-700 transition-all duration-300 flex items-center justify-center gap-2"
              >
                <FaTrash className="w-4 h-4" />
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;