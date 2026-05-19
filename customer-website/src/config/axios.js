import axios from 'axios';

const apiUrl = 'http://72.62.254.128:5000';

const api = axios.create({
    baseURL: apiUrl,
    headers: {
        'Content-Type': 'application/json',
    },
});

export default api;
