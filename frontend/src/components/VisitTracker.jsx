'use client';

import { useEffect } from 'react';

export function VisitTracker() {
  useEffect(() => {
    let visitorId = localStorage.getItem('visitor_id');
    if (!visitorId) {
      visitorId = 'v_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      localStorage.setItem('visitor_id', visitorId);
    }
    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/track-visit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Visitor-ID': visitorId },
    }).catch(() => {});
  }, []);
  return null;
}
