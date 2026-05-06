import axios from 'axios';

const apiUrl = 'https://nonisotropous-noncongruously-latoria.ngrok-free.dev';

const api = axios.create({
  baseURL: apiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;





