import axios from 'axios';
import { toast } from 'react-toastify';

// --- API Base URL ---
const API_BASE_URL = 'https://gnstncbc.com/api'; // Production
// export const API_BASE_URL = 'http://localhost:8080/api'; // Local development

// --- API Client (Axios Instance) ---
export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    },
});

//handle expired JWT
apiClient.interceptors.response.use(
    response => response,
    error => {
        if (error.response && error.response.status === 401) {
            //clear jwt from local storage
            localStorage.removeItem('token');
            localStorage.setItem('redirectAfterLogin', window.location.pathname + window.location.search);
            localStorage.setItem('fromJWTError', "true");
            window.location.href = '/login';
            
            console.log('JWT expired, redirecting to login');
            toast.error('Lütfen tekrar giriş yapınız.');
        }
        return Promise.reject(error);
    }
);

