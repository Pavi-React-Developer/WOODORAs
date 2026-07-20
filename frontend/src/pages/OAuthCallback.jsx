import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authService } from '../api/authService';

export default function OAuthCallback({ onAuthSuccess }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    const refreshToken = searchParams.get('refreshToken');

    if (token && refreshToken) {
      // Save tokens to localStorage (same as normal login)
      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);

      // Fetch the user's profile to populate state and complete login
      authService.getProfile()
        .then(profileData => {
          if (profileData && profileData.user) {
            const mappedUser = {
              id: profileData.user._id,
              name: profileData.user.name,
              email: profileData.user.email,
              role: profileData.user.role,
              avatar: profileData.user.avatar,
              isStaff: profileData.user.role !== 'user'
            };
            
            // Critical: Save the user to localStorage so the session persists
            authService.setSession(token, refreshToken, mappedUser);
            
            onAuthSuccess(mappedUser);
            navigate(mappedUser.isStaff ? '/admin' : '/');
          }
        })
        .catch(err => {
          console.error('Failed to fetch profile after OAuth login', err);
          navigate('/login?error=OAuthFailed');
        });
    } else {
      console.error('Tokens not found in URL parameters');
      navigate('/login?error=OAuthFailed');
    }
  }, [searchParams, navigate, onAuthSuccess]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-light">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-dark mx-auto"></div>
        <p className="mt-4 text-brand-dark font-medium">Completing login...</p>
      </div>
    </div>
  );
}
