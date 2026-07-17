const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/auth`;

// Helper to get authorization headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const authService = {
  // Register a new user
  register: async (name, email, password, role = 'user') => {
    try {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      // Save credentials in session
      if (data.token) {
        authService.setSession(data.token, data.refreshToken, {
          id: data._id,
          name: data.name,
          email: data.email,
          role: data.role,
        });
      }

      return data;
    } catch (error) {
      console.error('Registration API Error:', error);
      throw error;
    }
  },

  // Login user
  login: async (email, password) => {
    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Save credentials in session
      if (data.token) {
        authService.setSession(data.token, data.refreshToken, {
          id: data._id,
          name: data.name,
          email: data.email,
          role: data.role,
          isStaff: data.isStaff,
        });
      }

      return data;
    } catch (error) {
      console.error('Login API Error:', error);
      throw error;
    }
  },

  // Forgot password
  forgotPassword: async (email) => {
    try {
      const response = await fetch(`${API_BASE_URL}/forgotpassword`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Forgot password request failed');
      }

      return data;
    } catch (error) {
      console.error('Forgot Password API Error:', error);
      throw error;
    }
  },

  // Get current user profile (protected)
  getProfile: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      });

      const data = await response.json();
      if (response.status === 401) {
        // Token might have expired, try to refresh
        const refreshed = await authService.refreshSession();
        if (refreshed) {
          // Retry the request with new token
          return authService.getProfile();
        } else {
          authService.logout();
          throw new Error('Session expired, please log in again.');
        }
      }

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch profile');
      }

      return data;
    } catch (error) {
      console.error('Profile API Error:', error);
      throw error;
    }
  },

  // Update current user profile (protected)
  updateProfile: async (profileData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify(profileData),
      });

      const data = await response.json();
      if (response.status === 401) {
        const refreshed = await authService.refreshSession();
        if (refreshed) {
          return authService.updateProfile(profileData);
        }
        authService.logout();
        throw new Error('Session expired, please log in again.');
      }

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update profile');
      }

      if (data.user) {
        authService.updateStoredUser(data.user);
      }

      return data;
    } catch (error) {
      console.error('Update Profile API Error:', error);
      throw error;
    }
  },

  // Refresh access token using refresh token
  refreshSession: async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${API_BASE_URL}/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: refreshToken }),
      });

      const data = await response.json();
      if (response.ok && data.token) {
        localStorage.setItem('token', data.token);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Token Refresh Error:', error);
      return false;
    }
  },

  // Store user session in localStorage
  setSession: (token, refreshToken, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
  },

  updateStoredUser: (updates) => {
    const currentUser = authService.getCurrentUser() || {};
    const nextUser = {
      ...currentUser,
      id: updates._id || updates.id || currentUser.id,
      name: updates.name ?? currentUser.name,
      email: updates.email ?? currentUser.email,
      role: updates.role ?? currentUser.role,
      isStaff: updates.isStaff ?? currentUser.isStaff,
    };
    localStorage.setItem('user', JSON.stringify(nextUser));
    return nextUser;
  },

  // Clear user session from localStorage
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  },

  // Get currently logged-in user from localStorage
  getCurrentUser: () => {
    const userJson = localStorage.getItem('user');
    try {
      return userJson ? JSON.parse(userJson) : null;
    } catch (e) {
      return null;
    }
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem('token');
  }
};
