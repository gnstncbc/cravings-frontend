import axios from 'axios';

// --- API Base URL ---
//const API_BASE_URL = 'https://gnstncbc.com/api'; // Production
export const API_BASE_URL = 'http://localhost:8080/api'; // Local development

// --- API Client (Axios Instance) ---
export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});