'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminReviews from '@/views/admin/AdminReviews';
export default function Page() { return <ProtectedRoute><AdminReviews /></ProtectedRoute>; }
