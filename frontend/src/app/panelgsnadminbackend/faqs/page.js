'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminFAQs from '@/views/admin/AdminFAQs';
export default function Page() { return <ProtectedRoute><AdminFAQs /></ProtectedRoute>; }
