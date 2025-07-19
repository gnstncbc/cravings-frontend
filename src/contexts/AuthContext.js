import React, { createContext, useState, useEffect, useCallback } from 'react';
import { apiClient } from '../components/Carpet/api'; // Assuming this is your base API client

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [isLoading, setIsLoading] = useState(true); // To check initial auth status

    const parseJwt = (tokenToParse) => {
        if (!tokenToParse) return null;
        try {
            const base64Url = tokenToParse.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
                atob(base64)
                    .split('')
                    .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
            );
            return JSON.parse(jsonPayload);
        } catch (e) {
            console.error("Error parsing JWT:", e);
            return null;
        }
    };

    const fetchUserProfile = useCallback(async (currentToken) => {
        if (!currentToken) {
            setUser(null);
            setIsLoading(false);
            return;
        }
        try {
            const originalAuth = apiClient.defaults.headers.common['Authorization'];
            // No need to set it here if already set in useEffect or login/register actions
            // apiClient.defaults.headers.common['Authorization'] = `Bearer ${currentToken}`;
            
            const decodedToken = parseJwt(currentToken);
            if (decodedToken) {
                setUser({
                    username: decodedToken.sub, 
                    roles: decodedToken.roles || [], 
                    // Add other relevant fields if present in JWT like email, firstname, lastname
                    // email: decodedToken.email,
                    email: decodedToken.sub, // Assuming sub is the email
                    firstname: decodedToken.firstname,
                    lastname: decodedToken.lastname,
                });
            } else {
                localStorage.removeItem('token');
                setToken(null);
                setUser(null);
                delete apiClient.defaults.headers.common['Authorization'];
            }
            // if (originalAuth) { 
            //      apiClient.defaults.headers.common['Authorization'] = originalAuth;
            // } else if (!decodedToken){ 
            //      delete apiClient.defaults.headers.common['Authorization'];
            // }

        } catch (error) {
            console.error("Failed to fetch user profile or token invalid:", error);
            localStorage.removeItem('token');
            setToken(null);
            setUser(null);
            delete apiClient.defaults.headers.common['Authorization'];
        } finally {
            setIsLoading(false);
        }
    }, []);


    useEffect(() => {
        const currentToken = localStorage.getItem('token'); // Re-check token from localStorage
        if (currentToken) {
            apiClient.defaults.headers.common['Authorization'] = `Bearer ${currentToken}`;
            fetchUserProfile(currentToken);
        } else {
            delete apiClient.defaults.headers.common['Authorization'];
            setUser(null);
            setIsLoading(false);
        }
    }, [fetchUserProfile]); // Removed token from dependency array to avoid potential loops if fetchUserProfile itself modifies token state indirectly

    const login = async (email, password) => {
        try {
            const response = await apiClient.post('/auth/authenticate', { email, password }); // Updated endpoint
            const newToken = response.data.token; 
            if (newToken) {
                localStorage.setItem('token', newToken);
                setToken(newToken);
                apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
                await fetchUserProfile(newToken);
                return { success: true };
            }
            return { success: false, message: response.data.message || "No token received" };
        } catch (error) {
            console.error("Login failed:", error.response?.data?.message || error.message);
            return { success: false, message: error.response?.data?.message || "Login failed" };
        }
    };

    const register = async (userData) => {
        try {
            const response = await apiClient.post('/auth/register', userData); // Updated endpoint
            const newToken = response.data.token; // Expecting token on successful registration
            if (newToken) {
                localStorage.setItem('token', newToken);
                setToken(newToken);
                apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
                await fetchUserProfile(newToken); // Fetch profile and set user state
                return { success: true, autologin: true };
            }
            // Fallback if token is not in response for some reason, though DTO suggests it should be
            return { success: true, autologin: false }; 
        } catch (error) {
            console.error("Registration failed:", error.response?.data?.message || error.message);
            return { success: false, message: error.response?.data?.message || "Registration failed" };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        delete apiClient.defaults.headers.common['Authorization'];
        window.location.href = '/login'; // Force a full page reload to clear any stale state
    };

    return (
        <AuthContext.Provider value={{ 
            user, 
            token, 
            login, 
            logout, 
            register, 
            isLoading, 
            isAuthenticated: !!token && !!user // More strict authentication check
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => React.useContext(AuthContext); 