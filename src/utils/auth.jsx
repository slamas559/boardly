// No need to manually handle tokens on frontend anymore
// The browser automatically sends HTTP-Only cookies with requests

const API_URL = import.meta.env.VITE_API_URL;

export const isLoggedIn = async () => {
  try {
    // Check if user has valid session by calling a protected endpoint
    const response = await api.post(`/auth/check-auth`);
    return response.ok;
  } catch (error) {
    return false;
  }
};

export const isLogout = async () => {
  try {
      // Call the logout endpoint to clear the HTTP-Only cookie
      await api.post('/auth/logout');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      navigate('/login');
    }
};

// Helper function to fetch with credentials
export const fetchWithAuth = async (url, options = {}) => {
  return fetch(url, {
    ...options,
    credentials: 'include', // Always include cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    }
  });
};