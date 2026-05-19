import axios from 'axios';

// Configure axios defaults
// In development, Vite proxy handles /api requests (see vite.config.js)
// In production, baseURL points to the backend server directly
axios.defaults.baseURL = 'http://72.62.254.128:5000';
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Get token from localStorage and set it in axios defaults
const token = localStorage.getItem('token');
if (token) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// Add request interceptor to ensure token is always included
axios.interceptors.request.use(
  (config) => {
    // Always get fresh token from localStorage (in case it was updated)
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log(`Making ${config.method.toUpperCase()} request to: ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with error
      console.error('API Error:', error.response.status, error.response.data);
    } else if (error.request) {
      // Request made but no response
      console.error('Network Error: No response from server. Is backend running?');
    } else {
      console.error('Error:', error.message);
    }
    return Promise.reject(error);
  }
);

export default axios;

