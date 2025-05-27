// src/components/Admin/AdminPage.js
// NEW FILE
import React, { useState, useEffect } from 'react';
import { apiClient } from '../Carpet/api';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import UserList from './UserList';
import MatchPollAdminActions from './MatchPollAdminActions';

const AdminPage = () => {
    const [isLoading, setIsLoading] = useState(false);

    const handlePopulateStats = async () => {
        if (!window.confirm("Are you sure you want to populate historical player stats? This can be a long-running process.")) {
            return;
        }
        setIsLoading(true);
        toast.info("Attempting to populate player stats...", { autoClose: false });
        try {
            await apiClient.post('/admin/populate-player-stats');
            toast.dismiss();
            toast.success("Player stats population process initiated successfully.");
        } catch (error) {
            toast.dismiss();
            console.error("Error populating player stats:", error.response?.data || error.message);
            toast.error(error.response?.data?.message || "Failed to initiate player stats population.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
            <ToastContainer autoClose={3000} hideProgressBar theme="dark" position="top-center" />
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-center text-blue-400">Admin Panel</h1>
            </header>

            <div className="space-y-12">
                {/* System Actions Section */}
                <section className="bg-gray-800 p-6 rounded-lg shadow-xl">
                    <h2 className="text-2xl font-semibold mb-6 text-gray-100 border-b border-gray-700 pb-3">System Actions</h2>
                    <div className="flex justify-center">
                        <button
                            onClick={handlePopulateStats}
                            disabled={isLoading}
                            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-md transition-colors duration-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {isLoading ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                                    Processing...
                                </>
                            ) : (
                                'Populate Historical Player Stats'
                            )}
                        </button>
                    </div>
                    <p className="text-sm text-gray-400 mt-3 text-center">
                        This action will process all completed matches to calculate and update player win/loss/draw statistics.
                    </p>
                </section>

                <div className="flex flex-col lg:flex-row gap-4">
                    {/* User Management Section */}
                    <div className="lg:w-1/2">
                        <UserList />
                    </div>

                    {/* Match & Poll Management Section */}
                    <div className="lg:w-1/2">
                        <MatchPollAdminActions />
                    </div>
                </div>

            </div>
            <footer className="mt-12 text-center text-gray-500 text-sm">
                Admin Panel - gnstncbc
            </footer>
        </div>
    );
};

export default AdminPage;