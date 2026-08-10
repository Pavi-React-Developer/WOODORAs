import React, { useState, useEffect } from 'react';
import { authService } from '../api/authService';
import { Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [isVerifying, setIsVerifying] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setIsVerifying(false);
        setIsValidToken(false);
        return;
      }

      try {
        const response = await authService.verifyResetToken(token);
        setIsValidToken(response.valid);
      } catch (err) {
        setIsValidToken(false);
      } finally {
        setIsVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    if (password !== confirmPassword) {
      setFormErrors(prev => ({...prev, confirmPassword: 'Passwords do not match.'}));
      setIsLoading(false);
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\w\W]{8,}$/;
    if (!passwordRegex.test(password)) {
      setFormErrors(prev => ({...prev, password: 'Must be at least 8 chars, 1 uppercase, 1 lowercase, 1 number.'}));
      setIsLoading(false);
      return;
    }

    try {
      const data = await authService.resetPassword(token, password, confirmPassword);
      setSuccessMsg(data.message || 'Password has been updated successfully.');
    } catch (err) {
      console.error('Reset password error:', err);
      setErrorMsg(err.message || 'Failed to reset password. The link might have expired.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7] font-sans p-4 relative overflow-hidden">
      
      <div className="bg-white w-full max-w-[440px] rounded-[32px] p-8 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col relative z-10 border border-[#F3EFEA]">
        
        {/* Header Text */}
        <div className="text-center mb-8">
          {localStorage.getItem('cms_cached_logo') && (
            <img src={localStorage.getItem('cms_cached_logo')} alt="Logo" className="h-16 mx-auto mb-4 object-contain" />
          )}
          <h2 className="text-[26px] font-semibold text-[#4A3B32] mb-1">
            Create New Password
          </h2>
          <p className="text-[#8C7E76] text-[15px]">
            Please enter your new password below
          </p>
        </div>

        {/* Status Messages */}
        {errorMsg && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm px-4 py-3 rounded-r">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mb-6 bg-green-50 border-l-4 border-green-500 text-green-700 text-sm px-4 py-3 rounded-r flex flex-col gap-3">
            <span>{successMsg}</span>
            <button 
              onClick={() => navigate('/login')}
              className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors w-fit flex items-center gap-2"
            >
              Go to Login <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Verifying State */}
        {isVerifying ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#BC8471]"></div>
            <p className="text-[#8C7E76]">Verifying link...</p>
          </div>
        ) : !isValidToken ? (
          /* Invalid Token State */
          <div className="py-8 text-center space-y-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <Lock className="w-8 h-8 text-red-500" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Invalid or Expired Link</h3>
              <p className="text-sm text-gray-500">
                This password reset link is invalid or has expired. Please request a new one.
              </p>
            </div>
            <button
              onClick={() => navigate('/forgot-password')}
              className="w-full bg-[#B88673] hover:bg-[#A37361] text-white text-[15px] font-medium py-3.5 rounded-xl transition-colors shadow-sm"
            >
              Request New Link
            </button>
          </div>
        ) : (
          /* Reset Form */
          !successMsg && (
            <form onSubmit={handleSubmit} className="space-y-5">
              
              <div className="space-y-2">
                <label className="text-[13px] font-semibold text-[#4A3B32]">New Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-[#BBAFA8]" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => { 
                      const val = e.target.value;
                      setPassword(val); 
                      setErrorMsg(''); 
                      if(formErrors.password) setFormErrors(prev => ({...prev, password: ''}));
                      
                      if (confirmPassword) {
                        if (val !== confirmPassword) {
                          setFormErrors(prev => ({...prev, confirmPassword: 'Passwords do not match.'}));
                        } else {
                          setFormErrors(prev => ({...prev, confirmPassword: ''}));
                        }
                      }
                    }}
                    className={`w-full pl-11 pr-11 py-3.5 border ${formErrors.password ? 'border-red-300 focus:border-red-500' : 'border-[#EAE5DF] focus:border-[#BC8471]'} rounded-xl text-[15px] focus:outline-none focus:ring-1 focus:ring-[#BC8471] transition-colors bg-[#FCFBFA] placeholder-[#BBAFA8] text-[#4A3B32]`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#BBAFA8] hover:text-[#8C7E76] transition-colors focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {formErrors.password && <p className="text-red-500 text-xs mt-1">{formErrors.password}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-[13px] font-semibold text-[#4A3B32]">Confirm New Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-[#BBAFA8]" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => { 
                      const val = e.target.value;
                      setConfirmPassword(val); 
                      setErrorMsg(''); 
                      
                      if (val && password && val !== password) {
                        setFormErrors(prev => ({...prev, confirmPassword: 'Passwords do not match.'}));
                      } else {
                        setFormErrors(prev => ({...prev, confirmPassword: ''}));
                      }
                    }}
                    className={`w-full pl-11 pr-11 py-3.5 border ${formErrors.confirmPassword ? 'border-red-300 focus:border-red-500' : 'border-[#EAE5DF] focus:border-[#BC8471]'} rounded-xl text-[15px] focus:outline-none focus:ring-1 focus:ring-[#BC8471] transition-colors bg-[#FCFBFA] placeholder-[#BBAFA8] text-[#4A3B32]`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#BBAFA8] hover:text-[#8C7E76] transition-colors focus:outline-none"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {formErrors.confirmPassword && <p className="text-red-500 text-xs mt-1">{formErrors.confirmPassword}</p>}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#B88673] hover:bg-[#A37361] text-white text-[15px] font-medium py-3.5 rounded-xl mt-4 transition-colors disabled:opacity-70 shadow-sm"
              >
                {isLoading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          )
        )}

        {/* Footer Area inside Card */}
        <div className="mt-8 pt-6 border-t border-[#F3EFEA] flex justify-between items-center">
          <span className="text-[12px] text-[#A39992]">© 2026 Marakathai. All rights reserved.</span>
          <div className="flex items-center gap-1.5 text-[12px] text-[#A39992]">
            <Lock className="w-3.5 h-3.5" />
            <span>Secure Reset</span>
          </div>
        </div>

      </div>
    </div>
  );
}
