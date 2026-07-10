'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminAds from '@/views/admin/AdminAds';
export default function Page() { return <ProtectedRoute><AdminAds /></ProtectedRoute>; }
