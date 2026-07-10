'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminComplaints from '@/views/admin/AdminComplaints';
export default function Page() { return <ProtectedRoute><AdminComplaints /></ProtectedRoute>; }
