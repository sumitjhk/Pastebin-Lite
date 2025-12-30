import { notFound } from 'next/navigation';
import PasteView from '@/components/PasteView';
import { fetchPaste } from '@/lib/paste';
import { getCurrentTime } from '@/lib/time';

export default async function PastePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  
  // Get current time
  const currentTime = getCurrentTime();
  
  // Fetch paste - do NOT decrement views on SSR
  // Views should only be decremented on client-side interaction
  const paste = await fetchPaste(id, currentTime, false);
  
  if (!paste) {
    notFound();
  }
  
  // Format response
  const response = {
    content: paste.content,
    remaining_views: paste.remainingViews,
    expires_at: paste.expiresAt ? new Date(paste.expiresAt).toISOString() : null,
  };
  
  return (
    <PasteView
      content={response.content}
      remainingViews={response.remaining_views}
      expiresAt={response.expires_at}
      pasteId={id}
    />
  );
}