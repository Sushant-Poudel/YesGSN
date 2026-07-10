'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminBlocklist from '@/views/admin/AdminBlocklist';
export default function Page() { return <ProtectedRoute><AdminBlocklist /></ProtectedRoute>; }
