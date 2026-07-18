import React, { useState } from 'react';
import { authService } from '../api/authService';

export default function Login({ onAuthSuccess, onNavigate }) {
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
        const mappedUser = {
          id: data._id,
          name: data.name,
          email: data.email,
          role: data.role,
          isStaff: data.isStaff
        };
        setTimeout(() => {
          onAuthSuccess(data);
          onNavigate(data.role === 'admin' || data.isStaff ? 'admin' : 'home', mappedUser);
        }, 1500);
      } 
      
      else if (mode === 'register') {
        if (!name || !email || !password) {
          throw new Error('Please fill in all registration fields.');
        }
        const data = await authService.register(name, email, password, role);
        setSuccessMsg(`Account created successfully for ${data.name}!`);
        const mappedUser = {
          id: data._id,
          name: data.name,
          email: data.email,
          role: data.role
        };
        setTimeout(() => {
          onAuthSuccess(data);
          onNavigate(data.role === 'admin' ? 'admin' : 'home', mappedUser);
        }, 1500);
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
    <div className="min-h-screen flex flex-col bg-brand-light font-sans text-brand-dark">
      
      {/* ── TOP HEADER ── */}
      <header className="h-16 shrink-0 bg-[#F9FAFB] flex items-center justify-between px-6 border-b border-gray-200">
        <button 
          onClick={() => onNavigate('/')}
          className="font-serif text-xl font-bold tracking-tight text-brand-dark cursor-pointer"
        >
          WoodenToys
        </button>
        <button className="text-brand-medium hover:text-brand-dark transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        </button>
      </header>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col md:flex-row">
        
        {/* Left Image Section */}
        <div className="hidden md:flex md:w-1/2 relative bg-brand-light">
          <img 
            src="/hero1.jpeg" 
            alt="Children playing" 
            className="w-full h-full object-cover"
            onError={(e) => {
              // fallback if image not found to a solid elegant color
              e.target.style.display = 'none';
              e.target.parentElement.classList.add('bg-[#D4C9B8]');
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"></div>
          <div className="absolute bottom-10 left-10 right-10">
            <h2 className="text-white text-3xl font-medium leading-tight">
              Crafted for imagination, built for sustainability.
            </h2>
          </div>
        </div>

        {/* Right Form Section */}
        <div className="w-full md:w-1/2 flex items-center justify-center p-8 bg-white">
          <div className="max-w-sm w-full py-8">
            
            {/* Header Text */}
            <div className="text-center mb-8">
              <h2 className="font-sans text-3xl font-bold text-brand-dark mb-2">WoodenToys</h2>
              <h3 className="text-xl font-medium text-brand-dark">
                {mode === 'login' && 'Welcome back'}
                {mode === 'register' && 'Create Account'}
                {mode === 'forgot' && 'Reset Password'}
              </h3>
              <p className="text-sm text-brand-medium mt-1">
                {mode === 'login' && 'Log in to your account to continue'}
                {mode === 'register' && 'Sign up to start your journey'}
                {mode === 'forgot' && 'Enter email to receive reset link'}
              </p>
            </div>

            {/* Status Messages */}
            {errorMsg && (
              <div className="mb-4 bg-red-50 border-l-2 border-red-500 text-red-700 text-xs px-4 py-3">
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="mb-4 bg-green-50 border-l-2 border-green-500 text-green-700 text-xs px-4 py-3">
                {successMsg}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {mode === 'register' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold tracking-widest uppercase text-brand-medium">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border border-gray-200 rounded px-4 py-2.5 text-sm focus:outline-none focus:border-brand-medium focus:ring-1 focus:ring-brand-medium transition-colors"
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
                  className="w-full border border-gray-200 rounded px-4 py-2.5 text-sm focus:outline-none focus:border-brand-medium focus:ring-1 focus:ring-brand-medium transition-colors"
                />
              </div>

              {mode !== 'forgot' && (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold tracking-widest uppercase text-brand-medium">Password</label>
                    {mode === 'login' && (
                      <button type="button" onClick={() => handleModeChange('forgot')} className="text-[10px] font-bold text-brand-dark hover:underline">
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
                    className="w-full border border-gray-200 rounded px-4 py-2.5 text-sm focus:outline-none focus:border-brand-medium focus:ring-1 focus:ring-brand-medium transition-colors"
                  />
                </div>
              )}

              {/* Role selector inside Registration (hidden normally, kept for testing) */}
              {mode === 'register' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold tracking-widest uppercase text-brand-medium">Account Role (Testing)</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full border border-gray-200 rounded px-4 py-2.5 text-sm focus:outline-none focus:border-brand-medium"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-brand-medium hover:bg-brand-dark text-white text-[11px] font-bold tracking-widest uppercase py-3.5 rounded mt-2 transition-colors disabled:opacity-70"
              >
                {isLoading ? 'Processing...' : (
                  mode === 'login' ? 'Login' :
                  mode === 'register' ? 'Sign Up' : 'Send Link'
                )}
              </button>
            </form>

            {/* Social Logins - Only on Login/Register */}
            {mode !== 'forgot' && (
              <div className="mt-8">
                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-gray-200"></div>
                  <span className="shrink-0 px-4 text-[10px] uppercase font-bold text-gray-400 tracking-wider">OR</span>
                  <div className="flex-grow border-t border-gray-200"></div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                  <button className="flex items-center justify-center gap-2 border border-gray-200 rounded py-2.5 hover:bg-gray-50 transition-colors">
                    {/* Google SVG */}
                    <svg className="w-14 h-4" viewBox="0 0 74 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9.1 11.2H17.5C17.7 12 17.8 12.9 17.8 13.9C17.8 16.5 16.9 18.8 15.3 20.3C13.7 21.9 11.6 22.7 9.1 22.7C4.1 22.7 0 18.6 0 13.6C0 8.6 4.1 4.5 9.1 4.5C11.5 4.5 13.5 5.4 15 6.8L12.4 9.4C11.6 8.7 10.5 8.1 9.1 8.1C6.2 8.1 3.8 10.5 3.8 13.6C3.8 16.7 6.2 19 9.1 19C12 19 13.3 17 13.7 15.1H9.1V11.2Z" fill="#202124"/>
                      <path d="M25.4 13.6C25.4 18.4 29.1 22.7 34.3 22.7C39.5 22.7 43.2 18.4 43.2 13.6C43.2 8.8 39.5 4.5 34.3 4.5C29.1 4.5 25.4 8.8 25.4 13.6ZM39.5 13.6C39.5 16 37.1 19.3 34.3 19.3C31.5 19.3 29.1 16 29.1 13.6C29.1 11.1 31.5 7.9 34.3 7.9C37.1 7.9 39.5 11.1 39.5 13.6Z" fill="#202124"/>
                      <path d="M44.7 13.6C44.7 18.4 48.4 22.7 53.6 22.7C58.8 22.7 62.5 18.4 62.5 13.6C62.5 8.8 58.8 4.5 53.6 4.5C48.4 4.5 44.7 8.8 44.7 13.6ZM58.8 13.6C58.8 16 56.4 19.3 53.6 19.3C50.8 19.3 48.4 16 48.4 13.6C48.4 11.1 50.8 7.9 53.6 7.9C56.4 7.9 58.8 11.1 58.8 13.6Z" fill="#202124"/>
                      <path d="M64.6 4.9V22.2H68.3V12.9H73.1V9.5H68.3V4.9H64.6Z" fill="#202124"/>
                    </svg>
                    <span className="text-xs text-brand-dark font-medium hidden">Google</span>
                  </button>
                  
                  <button className="flex items-center justify-center gap-2 border border-gray-200 rounded py-2.5 hover:bg-gray-50 transition-colors">
                    {/* Apple SVG placeholder using simple icon */}
                    <svg className="w-4 h-4 text-brand-dark" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z"/></svg>
                    <span className="text-xs text-brand-dark font-medium">Apple</span>
                  </button>
                </div>
              </div>
            )}

            {/* Toggle Mode */}
            <div className="mt-8 text-center text-xs text-brand-medium">
              {mode === 'login' ? (
                <>Don't have an account? <button onClick={() => handleModeChange('register')} className="font-bold text-brand-dark hover:underline">Sign up</button></>
              ) : mode === 'register' ? (
                <>Already have an account? <button onClick={() => handleModeChange('login')} className="font-bold text-brand-dark hover:underline">Log in</button></>
              ) : (
                <button onClick={() => handleModeChange('login')} className="font-bold text-brand-dark hover:underline">← Back to Login</button>
              )}
            </div>

          </div>
        </div>

      </div>

      {/* ── BOTTOM FOOTER ── */}
      <footer className="h-14 shrink-0 bg-[#F9FAFB] flex flex-col md:flex-row items-center justify-between px-6 border-t border-gray-200">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-bold tracking-widest uppercase text-brand-dark">WoodenToys</span>
          <span className="text-[10px] text-brand-medium">© 2026 WoodenToys. Sustainable Play.</span>
        </div>
        <div className="flex items-center gap-4 mt-2 md:mt-0">
          <a href="#" className="text-[10px] text-brand-medium hover:text-brand-dark">Privacy Policy</a>
          <a href="#" className="text-[10px] text-brand-medium hover:text-brand-dark">Terms of Service</a>
          <a href="#" className="text-[10px] text-brand-medium hover:text-brand-dark">Sustainability</a>
        </div>
      </footer>

    </div>
  );
}
