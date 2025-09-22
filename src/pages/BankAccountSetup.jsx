// BankAccountSetup.jsx - Component for tutors to setup their bank accounts
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { getToken } from "../utils/auth";

const BankAccountSetup = ({ onComplete }) => {
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [formData, setFormData] = useState({
    bankCode: '001',
    accountNumber: '',
    accountName: ''
  });
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBanks();
  }, []);

  const fetchBanks = async () => {
    try {
      const res = await api.get('/auth/banks');
      setBanks(res.data.banks);
    } catch (error) {
      setErrors({ fetch: 'Failed to load banks' });
    }
  };

  const resolveAccount = async () => {
    if (!formData.bankCode || !formData.accountNumber) {
      setErrors({ account: 'Please select bank and enter account number' });
      return;
    }

    if (formData.accountNumber.length !== 10) {
      setErrors({ account: 'Account number must be 10 digits' });
      return;
    }

    setResolving(true);
    setErrors({});

    try {
      // Resolve account using backend
    //   const bankCode = formData.bankCode;
      const bankCode = formData.bankCode; // Hardcoded to GTBank for now
      const accountNumber = formData.accountNumber;
      // console.log(bankCode, accountNumber);
      const res = await api.post("/auth/resolve-account", { bankCode, accountNumber },{
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      const data = res.data;
      console.log('Resolve response:', data);

      if (data.success) {
        setFormData(prev => ({ ...prev, accountName: data.accountName }));
        setStep(2);
      } else {
        setErrors({ account: 'Invalid account details' });
      }
    } catch (error) {
      setErrors({ account: 'Could not verify account details' });
      console.error('Account resolution error:', error);
    } finally {
      setResolving(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setErrors({});

    try {
      const token = getToken();
      // console.log(formData, token);
      const res = await api.post('/auth/setup-bank', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        onComplete?.({
          success: true,
          message: 'Bank account setup successful!'
        });
        setSuccess(true);
        navigate('/dashboard');
      }
    } catch (error) {
      setErrors({ 
        submit: error.response?.data?.message || 'Failed to setup bank account' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl p-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Setup Bank Account
        </h2>
        <p className="text-gray-600">
          Configure your bank account to receive 70% of all payments from your sessions
        </p>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center justify-center mb-8">
        <div className={`flex items-center ${step >= 1 ? 'text-green-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            step >= 1 ? 'bg-green-600 text-white' : 'bg-gray-200'
          }`}>
            1
          </div>
          <span className="ml-2 text-sm">Verify Account</span>
        </div>
        <div className={`w-8 h-0.5 mx-4 ${step >= 2 ? 'bg-green-600' : 'bg-gray-200'}`}></div>
        <div className={`flex items-center ${step >= 2 ? 'text-green-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            step >= 2 ? 'bg-green-600 text-white' : 'bg-gray-200'
          }`}>
            2
          </div>
          <span className="ml-2 text-sm">Confirm</span>
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Your Bank
            </label>
            <select
              value={formData.bankCode}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                bankCode: e.target.value,
                accountName: '' 
              }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="">Choose your bank</option>
              {banks.map((bank) => (
                <option key={bank.code + ' - ' + bank.name} value={bank.code}>
                  {bank.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Account Number
            </label>
            <input
              type="text"
              value={formData.accountNumber}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                accountNumber: e.target.value.replace(/\D/g, ''),
                accountName: ''
              }))}
              placeholder="Enter your 10-digit account number"
              maxLength="10"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          {errors.account && (
            <p className="text-red-500 text-sm">{errors.account}</p>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800 font-medium mb-1">Split Payment Info</p>
            <p className="text-xs text-blue-600">
              You'll receive 70% of all payments directly to this account. 
              Platform keeps 30% for fees and maintenance.
            </p>
          </div>

          <button
            onClick={resolveAccount}
            disabled={resolving || !formData.bankCode || formData.accountNumber.length !== 10}
            className="w-full bg-green-600 text-white font-semibold py-3 rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {resolving ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Verifying Account...
              </div>
            ) : (
              'Verify Account Details'
            )}
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center mb-2">
              <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <span className="text-sm font-medium text-green-800">Account Verified Successfully</span>
            </div>
            <p className="text-sm text-green-700 font-semibold">
              {formData.accountName}
            </p>
            <p className="text-xs text-green-600 mt-1">
              {banks.find(b => b.code === formData.bankCode)?.name} - {formData.accountNumber}
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm font-medium text-yellow-800 mb-2">Payment Split Breakdown</p>
            <div className="space-y-1 text-xs text-yellow-700">
              <div className="flex justify-between">
                <span>Your earnings (70%):</span>
                <span>Sent directly to your account</span>
              </div>
              <div className="flex justify-between">
                <span>Platform fee (30%):</span>
                <span>Covers processing & maintenance</span>
              </div>
            </div>
          </div>

          {errors.submit && (
            <p className="text-red-500 text-sm">{errors.submit}</p>
          )}
          {success && (
            <p className="text-green-600 text-sm">Bank account setup successful!</p>
          )}

          <div className="flex space-x-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-300 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 bg-green-600 text-white font-semibold py-3 rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Setting up...
                </div>
              ) : (
                'Complete Setup'
              )}
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500">
          Your bank details are securely stored and encrypted. 
          Payments are processed directly by Paystack with automatic splitting.
        </p>
      </div>
    </div>
  );
};

export default BankAccountSetup;