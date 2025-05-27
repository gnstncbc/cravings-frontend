// src/components/Admin/UserList.js
// NEW FILE
import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../Carpet/api';
import { toast } from 'react-toastify';

const UserList = () => {
    const [users, setUsers] = useState([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(true);
    const [editingUser, setEditingUser] = useState(null); // { email: string, role: string }
    const [targetRole, setTargetRole] = useState('');

    const fetchUsers = useCallback(async () => {
        setIsLoadingUsers(true);
        try {
            const response = await apiClient.get('/users');
            setUsers(response.data || []);
        } catch (error) {
            console.error("Error fetching users:", error.response?.data || error.message);
            toast.error(error.response?.data?.message || "Failed to fetch users.");
            setUsers([]);
        } finally {
            setIsLoadingUsers(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleEditRole = (user) => {
        setEditingUser(user);
        setTargetRole(user.role); // Pre-fill current role
    };

    const handleRoleChange = async (e) => {
        e.preventDefault();
        if (!editingUser || !targetRole) {
            toast.warn("Please select a user and a role.");
            return;
        }
        if (editingUser.role === targetRole) {
            toast.info("User already has this role.");
            setEditingUser(null);
            return;
        }

        const originalRole = editingUser.role; // Store original role for potential revert on UI

        // Optimistically update UI
        setUsers(prevUsers =>
            prevUsers.map(u =>
                u.email === editingUser.email ? { ...u, role: targetRole } : u
            )
        );
        setEditingUser(null); // Close modal/editing UI

        try {
            await apiClient.post('/users/change-role', { email: editingUser.email, role: targetRole });
            toast.success(`Role for ${editingUser.email} changed to ${targetRole} successfully.`);
            // fetchUsers(); // Re-fetch to confirm, or rely on optimistic update if API is robust
        } catch (error) {
            console.error("Error changing role:", error.response?.data || error.message);
            toast.error(error.response?.data?.message || "Failed to change role.");
            // Revert optimistic update
            setUsers(prevUsers =>
                prevUsers.map(u =>
                    u.email === editingUser.email ? { ...u, role: originalRole } : u
                )
            );
        }
    };

    if (isLoadingUsers) {
        return (
            <section className="bg-gray-800 p-6 rounded-lg shadow-xl">
                <h2 className="text-2xl font-semibold mb-4 text-gray-100 border-b border-gray-700 pb-3">User Management</h2>
                <div className="flex justify-center items-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-400"></div>
                    <p className="ml-3 text-gray-300">Loading users...</p>
                </div>
            </section>
        );
    }

    return (
        <section className="bg-gray-800 p-6 rounded-lg shadow-xl">
            <h2 className="text-2xl font-semibold mb-6 text-gray-100 border-b border-gray-700 pb-3">User Management</h2>
            <h3 className="text-lg font-semibold mb-4 text-gray-200">User Count {users.length}</h3>
            {users.length === 0 ? (
                <p className="text-gray-400 text-center">No users found.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-700">
                        <thead className="bg-gray-700">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">First Name</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Last Name</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Email</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Current Role</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-gray-800 divide-y divide-gray-700">
                            {users.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-700/50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">{user.firstname}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">{user.lastname}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">{user.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === 'ADMIN' ? 'bg-red-500 text-red-100' : 'bg-green-500 text-green-100'}`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button
                                            onClick={() => handleEditRole(user)}
                                            className="text-indigo-400 hover:text-indigo-300 transition-colors"
                                        >
                                            Change Role
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {editingUser && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-700 p-6 rounded-lg shadow-xl w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4 text-white">Change Role for {editingUser.email}</h3>
                        <form onSubmit={handleRoleChange}>
                            <div className="mb-4">
                                <label htmlFor="role" className="block text-sm font-medium text-gray-300 mb-1">New Role</label>
                                <select
                                    id="role"
                                    value={targetRole}
                                    onChange={(e) => setTargetRole(e.target.value)}
                                    className="w-full p-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="USER">USER</option>
                                    <option value="ADMIN">ADMIN</option>
                                </select>
                            </div>
                            <div className="flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => setEditingUser(null)}
                                    className="px-4 py-2 bg-gray-500 hover:bg-gray-400 text-white font-medium rounded-md transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
                                >
                                    Save Change
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </section>
    );
};

export default UserList;