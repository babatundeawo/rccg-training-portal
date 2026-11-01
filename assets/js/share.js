/* Share a link with the phone's own share sheet, or copy it where that is not available. */
import { toast } from './ui.js';

export async function shareLink({ title, text, url }) {
  try {
    if (navigator.share) {
      await navigator.share({ title, text, url });
      return;
    }
  } catch (error) {
    if (error && error.name === 'AbortError') return; // the person closed the share sheet
  }
  try {
    await navigator.clipboard.writeText(url);
    toast('Link copied. Paste it into a message to share.', { type: 'success' });
  } catch {
    toast(`Copy this link to share: ${url}`, { duration: 9000 });
  }
}
