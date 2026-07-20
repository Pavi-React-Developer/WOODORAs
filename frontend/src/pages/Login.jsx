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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
                  <button 
                    type="button"
                    onClick={() => window.location.href = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/auth/google`}
                    className="flex items-center justify-center gap-2 border border-gray-200 rounded py-2.5 hover:bg-gray-50 transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    <span className="text-xs text-brand-dark font-medium">Google</span>
                  </button>

                  {/* <button 
                    type="button"
                    onClick={() => window.location.href = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/auth/facebook`}
                    className="flex items-center justify-center gap-2 border border-gray-200 rounded py-2.5 hover:bg-gray-50 transition-colors"
                  >
                    <svg className="w-4 h-4 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    <span className="text-xs text-brand-dark font-medium">Facebook</span>
                  </button>

                  <button 
                    type="button"
                    onClick={() => window.location.href = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/auth/apple`}
                    className="flex items-center justify-center gap-2 border border-gray-200 rounded py-2.5 hover:bg-gray-50 transition-colors"
                  >
                    <svg className="w-4 h-4 text-black" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z"/></svg>
                    <span className="text-xs text-brand-dark font-medium">Apple</span>
                  </button>

                  <button 
                    type="button"
                    onClick={() => window.location.href = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/auth/github`}
                    className="flex items-center justify-center gap-2 border border-gray-200 rounded py-2.5 hover:bg-gray-50 transition-colors"
                  >
                    <svg className="w-4 h-4 text-[#333]" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z"/></svg>
                    <span className="text-xs text-brand-dark font-medium">GitHub</span>
                  </button>

                  <button 
                    type="button"
                    onClick={() => window.location.href = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/auth/microsoft`}
                    className="flex items-center justify-center gap-2 border border-gray-200 rounded py-2.5 md:col-span-2 hover:bg-gray-50 transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 21 21"><path fill="#f25022" d="M1 1h9v9H1z"/><path fill="#00a4ef" d="M1 11h9v9H1z"/><path fill="#7fba00" d="M11 1h9v9h-9z"/><path fill="#ffb900" d="M11 11h9v9h-9z"/></svg>
                    <span className="text-xs text-brand-dark font-medium">Microsoft</span>
                  </button> */}
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
