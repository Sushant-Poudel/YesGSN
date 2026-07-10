'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import AdminBlog from '@/views/admin/AdminBlog';
export default function Page() { return <ProtectedRoute><AdminBlog /></ProtectedRoute>; }
