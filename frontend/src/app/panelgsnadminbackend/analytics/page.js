'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminAnalytics from '@/views/admin/AdminAnalytics';
export default function Page() { return <ProtectedRoute><AdminAnalytics /></ProtectedRoute>; }
