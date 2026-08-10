import React, { useState } from 'react';
import { authService } from '../api/authService';
import { Mail, Lock, Eye, EyeOff, User } from 'lucide-react';

export default function Login({ onAuthSuccess, onNavigate }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  
  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user'); // default is user
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Status and feedbacks
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setRole('user');
    setErrorMsg('');
    setSuccessMsg('');
    setFormErrors({});
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
    resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      let errors = {};

      if (mode === 'login') {
        if (!email || !/^\S+@\S+\.\S+$/.test(email)) errors.email = 'Valid email is required.';
        if (!password) errors.password = 'Password is required.';
        
        if (Object.keys(errors).length > 0) {
          setFormErrors(errors);
          setIsLoading(false);
          return;
        }

        const data = await authService.login(email, password);
        setSuccessMsg(`Welcome back, ${data.name}! Login successful.`);
        const mappedUser = {
          id: data._id,
          name: data.name,
          email: data.email,
          role: data.role,
          isStaff: data.isStaff
        };
        onAuthSuccess(data);
        onNavigate(data.role === 'admin' || data.isStaff ? 'admin' : 'home', mappedUser);
      } 
      
      else if (mode === 'register') {
        if (!name || name.trim().length < 2) errors.name = 'Name must be at least 2 characters.';
        if (!email || !/^\S+@\S+\.\S+$/.test(email)) errors.email = 'Valid email is required.';
        if (!password || password.length < 8) errors.password = 'Password must be at least 8 characters.';
        if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match.';
        
        if (Object.keys(errors).length > 0) {
          setFormErrors(errors);
          setIsLoading(false);
          return;
        }

        const data = await authService.register(name, email, password, role);
        setSuccessMsg(`Account created successfully for ${data.name}!`);
        const mappedUser = {
          id: data._id,
          name: data.name,
          email: data.email,
          role: data.role
        };
        onAuthSuccess(data);
        onNavigate(data.role === 'admin' ? 'admin' : 'home', mappedUser);
      } 
    } catch (err) {
      console.error('Authentication error:', err);
      setErrorMsg(err.message || 'Something went wrong. Please check your connection.');
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
            {mode === 'login' && 'Welcome Back'}
            {mode === 'register' && 'Create Account'}
          </h2>
          <p className="text-[#8C7E76] text-[15px]">
            {mode === 'login' && 'Login to your account'}
            {mode === 'register' && 'Sign up to start your journey'}
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
          
          {mode === 'register' && (
            <div className="space-y-2">
              <label className="text-[13px] font-semibold text-[#4A3B32]">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-[#BBAFA8]" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => { setName(e.target.value); if(formErrors.name) setFormErrors({...formErrors, name: ''}); }}
                  className={`w-full pl-11 pr-4 py-3.5 border ${formErrors.name ? 'border-red-300 focus:border-red-500' : 'border-[#EAE5DF] focus:border-[#BC8471]'} rounded-xl text-[15px] focus:outline-none focus:ring-1 focus:ring-[#BC8471] transition-colors bg-[#FCFBFA] placeholder-[#BBAFA8] text-[#4A3B32]`}
                />
              </div>
              {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
            </div>
          )}

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
                onChange={(e) => { setEmail(e.target.value); if(formErrors.email) setFormErrors({...formErrors, email: ''}); }}
                className={`w-full pl-11 pr-4 py-3.5 border ${formErrors.email ? 'border-red-300 focus:border-red-500' : 'border-[#EAE5DF] focus:border-[#BC8471]'} rounded-xl text-[15px] focus:outline-none focus:ring-1 focus:ring-[#BC8471] transition-colors bg-[#FCFBFA] placeholder-[#BBAFA8] text-[#4A3B32]`}
              />
            </div>
            {formErrors.email && <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-[13px] font-semibold text-[#4A3B32]">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-[#BBAFA8]" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Enter your password"
                value={password}
                onChange={(e) => { 
                  const val = e.target.value;
                  setPassword(val); 
                  if(formErrors.password) setFormErrors(prev => ({...prev, password: ''}));
                  
                  if (mode === 'register' && confirmPassword) {
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
            
            {mode === 'register' && (
              <div className="space-y-2 mt-5">
                <label className="text-[13px] font-semibold text-[#4A3B32]">Confirm Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-[#BBAFA8]" />
                  </div>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => { 
                      const val = e.target.value;
                      setConfirmPassword(val); 
                      
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
            )}
            
            {mode === 'login' && (
              <div className="flex justify-end mt-1.5">
                <button type="button" onClick={() => onNavigate('/forgot-password')} className="text-[13px] text-[#A67B62] hover:text-[#8B6450] font-medium transition-colors">
                  Forgot Password?
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#B88673] hover:bg-[#A37361] text-white text-[15px] font-medium py-3.5 rounded-xl mt-4 transition-colors disabled:opacity-70 shadow-sm"
          >
            {isLoading ? 'Processing...' : (
              mode === 'login' ? 'Login' : 'Sign Up'
            )}
          </button>
        </form>

        {/* Social Logins */}
        <div className="mt-8 mb-4">
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#EAE5DF]"></div>
            </div>
            <div className="relative px-4 text-[13px] text-[#A39992] bg-white">
              or
            </div>
          </div>

          <div className="mt-6">
            <button 
              type="button"
              onClick={() => window.location.href = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/auth/google`}
              className="w-full flex items-center justify-center gap-3 border border-[#EAE5DF] rounded-xl py-3.5 hover:bg-[#FAF9F7] transition-colors text-[15px] font-medium text-[#7B6154]"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continue with Google
            </button>
          </div>
        </div>

        {/* Toggle Mode */}
        <div className="mt-auto pt-6 text-center text-[14px] text-[#8C7E76]">
          {mode === 'login' ? (
            <>Don't have an account? <button type="button" onClick={() => handleModeChange('register')} className="font-semibold text-[#A67B62] hover:text-[#8B6450] transition-colors">Register</button></>
          ) : (
            <>Already have an account? <button type="button" onClick={() => handleModeChange('login')} className="font-semibold text-[#A67B62] hover:text-[#8B6450] transition-colors">Login</button></>
          )}
        </div>

        {/* Footer Area inside Card */}
        <div className="mt-8 pt-6 border-t border-[#F3EFEA] flex justify-between items-center">
          <span className="text-[12px] text-[#A39992]">© 2026 Marakathai. All rights reserved.</span>
          <div className="flex items-center gap-1.5 text-[12px] text-[#A39992]">
            <Lock className="w-3.5 h-3.5" />
            <span>Secure Login</span>
          </div>
        </div>

      </div>
    </div>
  );
}
