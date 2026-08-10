import React, { useState } from 'react';
import { authService } from '../api/authService';
import { Mail, Lock, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setErrorMsg('Valid email is required.');
      setIsLoading(false);
      return;
    }

    try {
      const data = await authService.forgotPassword(email);
      setSuccessMsg(data.message || 'If an account with that email exists, a password reset link has been sent.');
      setEmail('');
    } catch (err) {
      console.error('Forgot password error:', err);
      // Still show the generic message even on some errors for security, unless it's a clear network error.
      setSuccessMsg('If an account with that email exists, a password reset link has been sent.');
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
            Reset Password
          </h2>
          <p className="text-[#8C7E76] text-[15px]">
            Enter your email to receive a reset link
          </p>
        </div>

        {/* Status Messages */}
        {errorMsg && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm px-4 py-3 rounded-r">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mb-6 bg-green-50 border-l-4 border-green-500 text-green-700 text-sm px-4 py-3 rounded-r">
            {successMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          
          <div className="space-y-2">
            <label className="text-[13px] font-semibold text-[#4A3B32]">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-[#BBAFA8]" />
              </div>
              <input
                type="email"
                required
                placeholder="Enter your email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrorMsg(''); }}
                className="w-full pl-11 pr-4 py-3.5 border border-[#EAE5DF] focus:border-[#BC8471] rounded-xl text-[15px] focus:outline-none focus:ring-1 focus:ring-[#BC8471] transition-colors bg-[#FCFBFA] placeholder-[#BBAFA8] text-[#4A3B32]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || successMsg !== ''}
            className="w-full bg-[#B88673] hover:bg-[#A37361] text-white text-[15px] font-medium py-3.5 rounded-xl mt-4 transition-colors disabled:opacity-70 shadow-sm"
          >
            {isLoading ? 'Processing...' : 'Send Reset Link'}
          </button>
        </form>

        {/* Back Link */}
        <div className="mt-8 pt-6 text-center text-[14px] text-[#8C7E76]">
          <button onClick={() => navigate('/login')} className="font-semibold text-[#A67B62] hover:text-[#8B6450] transition-colors flex items-center justify-center mx-auto gap-1">
            <ArrowLeft className="w-4 h-4" /> Back to Login
          </button>
        </div>

        {/* Footer Area inside Card */}
        <div className="mt-8 pt-6 border-t border-[#F3EFEA] flex justify-between items-center">
          <span className="text-[12px] text-[#A39992]">© 2026 Marakathai. All rights reserved.</span>
          <div className="flex items-center gap-1.5 text-[12px] text-[#A39992]">
            <Lock className="w-3.5 h-3.5" />
            <span>Secure Request</span>
          </div>
        </div>

      </div>
    </div>
  );
}
