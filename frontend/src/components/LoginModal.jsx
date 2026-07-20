import React, { useState } from 'react';
import { authService } from '../api/authService';
import { X } from 'lucide-react';

export default function LoginModal({ isOpen, onClose, onAuthSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'forgot'
  
  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user'); // default is user
  
  // Status and feedbacks
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setRole('user');
    setErrorMsg('');
    setSuccessMsg('');
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
      if (mode === 'login') {
        if (!email || !password) {
          throw new Error('Please fill in all credentials.');
        }
        const data = await authService.login(email, password);
        setSuccessMsg(`Welcome back, ${data.name}! Login successful.`);
        setTimeout(() => {
          onAuthSuccess(data);
          onClose();
        }, 1000);
      } 
      
      else if (mode === 'register') {
        if (!name || !email || !password) {
          throw new Error('Please fill in all registration fields.');
        }
        const data = await authService.register(name, email, password, role);
        setSuccessMsg(`Account created successfully for ${data.name}!`);
        setTimeout(() => {
          onAuthSuccess(data);
          onClose();
        }, 1000);
      } 
      
      else if (mode === 'forgot') {
        if (!email) {
          throw new Error('Please enter your email address.');
        }
        const data = await authService.forgotPassword(email);
        setSuccessMsg(`Mock Reset Email Triggered! Reset token: ${data.resetToken || 'mock_token'}`);
      }
    } catch (err) {
      console.error('Authentication error:', err);
      setErrorMsg(err.message || 'Something went wrong. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-8 overflow-hidden z-10 animate-fade-in-up">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <h2 className="font-sans text-2xl font-bold text-brand-dark mb-1">
            {mode === 'login' && 'Sign in to continue'}
            {mode === 'register' && 'Create Account'}
            {mode === 'forgot' && 'Reset Password'}
          </h2>
          <p className="text-sm text-brand-medium">
            {mode === 'login' && 'Please sign in to place your order.'}
            {mode === 'register' && 'Sign up to easily track your order.'}
            {mode === 'forgot' && 'Enter email to receive reset link'}
          </p>
        </div>

        {/* Status Messages */}
        {errorMsg && (
          <div className="mb-4 bg-red-50 border-l-2 border-red-500 text-red-700 text-xs px-4 py-3 rounded">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 bg-green-50 border-l-2 border-green-500 text-green-700 text-xs px-4 py-3 rounded">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {mode === 'register' && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold tracking-widest uppercase text-brand-medium">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#8B5E3C] focus:ring-1 focus:ring-[#8B5E3C] transition-colors"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold tracking-widest uppercase text-brand-medium">Email Address</label>
            <input
              type="email"
              required
              placeholder="hello@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#8B5E3C] focus:ring-1 focus:ring-[#8B5E3C] transition-colors"
            />
          </div>

          {mode !== 'forgot' && (
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold tracking-widest uppercase text-brand-medium">Password</label>
                {mode === 'login' && (
                  <button type="button" onClick={() => handleModeChange('forgot')} className="text-[10px] font-bold text-[#8B5E3C] hover:underline">
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#8B5E3C] focus:ring-1 focus:ring-[#8B5E3C] transition-colors"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#8B5E3C] hover:bg-[#7a5234] text-white text-[12px] font-bold tracking-widest uppercase py-3.5 rounded-xl mt-4 transition-colors disabled:opacity-70"
          >
            {isLoading ? 'Processing...' : (
              mode === 'login' ? 'Login' :
              mode === 'register' ? 'Sign Up' : 'Send Link'
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-brand-medium">
          {mode === 'login' ? (
            <>Don't have an account? <button onClick={() => handleModeChange('register')} className="font-bold text-[#8B5E3C] hover:underline ml-1">Sign up</button></>
          ) : mode === 'register' ? (
            <>Already have an account? <button onClick={() => handleModeChange('login')} className="font-bold text-[#8B5E3C] hover:underline ml-1">Log in</button></>
          ) : (
            <button onClick={() => handleModeChange('login')} className="font-bold text-[#8B5E3C] hover:underline">← Back to Login</button>
          )}
        </div>
      </div>
    </div>
  );
}
