import { toast } from 'sonner';

/**
 * Copies text to the clipboard with fallback support for older browsers
 * and non-secure contexts.
 * 
 * @param text - The string to copy
 * @param label - A descriptive label for the toast notification (e.g., 'ID', 'SMIB')
 * @returns Promise resolving to true if successful, false otherwise
 */
export const copyToClipboard = async (text: string, label: string): Promise<boolean> => {
  if (!text || text === 'N/A' || text.trim() === '') {
    toast.error(`No ${label} value to copy`);
    return false;
  }

  const cleanText = text.trim();

  try {
    // 1. Try using the modern Clipboard API
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(cleanText);
        toast.success(`${label} copied to clipboard`);
        return true;
      } catch (clipboardError) {
        console.warn('Clipboard API failed, trying fallback:', clipboardError);
        // Fall through to fallback
      }
    }

    // 2. Fallback for older browsers or non-secure contexts
    const textArea = document.createElement('textarea');
    textArea.value = cleanText;

    // Ensure the textarea is off-screen but still part of the DOM
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '0';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);

    textArea.focus();
    textArea.select();

    let successful = false;
    try {
      successful = document.execCommand('copy');
    } catch (err) {
      console.error('execCommand copy failed:', err);
    }

    document.body.removeChild(textArea);

    if (successful) {
      toast.success(`${label} copied to clipboard`);
      return true;
    } else {
      throw new Error('Copy command failed');
    }
  } catch (err) {
    console.error(`Failed to copy ${label}:`, err);
    toast.error(`Could not copy ${label}. Please try selecting and copying manually.`);
    return false;
  }
};
