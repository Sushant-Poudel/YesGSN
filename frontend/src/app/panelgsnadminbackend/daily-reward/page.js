'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminDailyReward from '@/views/admin/AdminDailyReward';
export default function Page() { return <ProtectedRoute><AdminDailyReward /></ProtectedRoute>; }
