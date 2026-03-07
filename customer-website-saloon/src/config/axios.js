import axios from 'axios';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: '', // Use relative paths to let Vite proxy handle it
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;





