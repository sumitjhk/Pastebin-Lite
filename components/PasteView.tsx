'use client';

import { useState, useEffect } from 'react';

interface PasteViewProps {
  content: string;
  remainingViews: number | null;
  expiresAt: string | null;
  pasteId?: string;
}

export default function PasteView({ content, remainingViews, expiresAt, pasteId }: PasteViewProps) {
  const [views, setViews] = useState(remainingViews);
  const [hasViewed, setHasViewed] = useState(false);

  const handleViewedClick = async () => {
    if (!pasteId || hasViewed || views === 0) return;

    try {
      const res = await fetch(`/api/pastes/${pasteId}`, {
        method: 'GET',
      });

      if (res.ok) {
        const data = await res.json();
        setViews(data.remaining_views);
        setHasViewed(true);
      }
    } catch (err) {
      console.error('Failed to record view', err);
    }
  };

  // Auto-record view on component mount if pasteId is provided
  useEffect(() => {
    if (pasteId && !hasViewed && views !== 0) {
      handleViewedClick();
    }
  }, [pasteId, hasViewed, views]);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Paste Content</h1>
        <div className="text-sm text-gray-600 space-y-1">
          {views !== null && (
            <div>Views remaining: {views}</div>
          )}
          {expiresAt && (
            <div>Expires: {new Date(expiresAt).toISOString().replace('T', ' ').slice(0, 19)}</div>
          )}
        </div>
      </div>

      <div className="bg-gray-50 border rounded-lg p-4 whitespace-pre-wrap break-words font-mono text-sm">
        {content}
      </div>
    </div>
  );
}