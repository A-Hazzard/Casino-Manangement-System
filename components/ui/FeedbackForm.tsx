/**
 * Feedback Form Component
 * Modal form for submitting user feedback with validation and profanity filtering.
 *
 * Features:
 * - Feedback category selection
 * - Email input (optional for logged-in users)
 * - Description textarea
 * - Profanity filtering
 * - Form validation
 * - Success/error states
 * - Toast notifications
 * - Framer Motion animations
 *
 * Large component (~414 lines) handling feedback submission workflow.
 *
 * @param isOpen - Whether the form modal is visible
 * @param onClose - Callback to close the form
 */
'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, CheckCircle2, AlertCircle } from 'lucide-react';
import { useState, useMemo, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import profaneWords from 'profane-words';
import { ADDITIONAL_BAD_WORDS } from '@/lib/constants/badWords';
import { useUserStore } from '@/lib/store/userStore';

// ============================================================================
// Constants
// ============================================================================

const FEEDBACK_CATEGORIES = [
  { value: 'bug', label: '🐛 Bug Report' },
  { value: 'suggestion', label: '💡 Suggestion' },
  { value: 'general-review', label: '⭐ General Review' },
  { value: 'feature-request', label: '✨ Feature Request' },
  { value: 'performance', label: '⚡ Performance Issue' },
  { value: 'ui-ux', label: '🎨 UI/UX Feedback' },
  { value: 'other', label: '📝 Other' },
] as const;

type FeedbackFormProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function FeedbackForm({ isOpen, onClose }: FeedbackFormProps) {
  const { user } = useUserStore();
  const isLoggedIn = !!user;
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState<string>('other');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [profanityError, setProfanityError] = useState<string>('');
  const [hasProfanity, setHasProfanity] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previousLengthRef = useRef(0);

  // Set email from logged-in user when form opens
  useEffect(() => {
    if (isOpen && isLoggedIn && user?.emailAddress) {
      setEmail(user.emailAddress);
    } else if (isOpen && !isLoggedIn) {
      setEmail('');
    }
  }, [isOpen, isLoggedIn, user?.emailAddress]);

  // Combine profane-words library with custom bad words list
  const badWordsSet = useMemo(() => {
    const allWords = new Set<string>();
    // Add words from profane-words library
    profaneWords.forEach(word => allWords.add(word.toLowerCase()));
    // Add custom bad words
    ADDITIONAL_BAD_WORDS.forEach(word => allWords.add(word.toLowerCase()));
    return allWords;
  }, []);

  // Check if text contains profanity
  const checkProfanity = (text: string): { hasProfanity: boolean; badWord?: string } => {
    const words = text.toLowerCase().split(/\s+/);
    for (const word of words) {
      // Remove punctuation for checking
      const cleanWord = word.replace(/[^\w]/g, '');
      if (cleanWord && badWordsSet.has(cleanWord)) {
        return { hasProfanity: true, badWord: cleanWord };
      }
    }
    return { hasProfanity: false };
  };

  // Handle description change with profanity checking
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const currentLength = description.length;
    const newLength = newValue.length;
    const isBackspace = newLength < currentLength;

    // If backspace, allow it and check if profanity is removed
    if (isBackspace) {
      setDescription(newValue);
      const check = checkProfanity(newValue);
      if (!check.hasProfanity) {
        setHasProfanity(false);
        setProfanityError('');
      }
      previousLengthRef.current = newLength;
      return;
    }

    // If typing forward and profanity exists, prevent typing
    if (hasProfanity && newLength > currentLength) {
      e.preventDefault();
      return;
    }

    // Check for profanity in new text
    const check = checkProfanity(newValue);
    if (check.hasProfanity) {
      setHasProfanity(true);
      setProfanityError(
        `Inappropriate language detected. Please remove the offensive word to continue.`
      );
      setDescription(newValue);
      previousLengthRef.current = newLength;
    } else {
      setHasProfanity(false);
      setProfanityError('');
      setDescription(newValue);
      previousLengthRef.current = newLength;
    }
  };

  // Handle keydown to prevent typing when profanity exists
  const handleDescriptionKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Allow backspace, delete, arrow keys, and other navigation keys
    const allowedKeys = [
      'Backspace',
      'Delete',
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Home',
      'End',
      'Tab',
      'Enter',
    ];

    if (hasProfanity && !allowedKeys.includes(e.key) && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      toast.error('Please remove the inappropriate word before continuing');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if ((!isLoggedIn && !email.trim()) || !category || !description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Final profanity check before submission
    const check = checkProfanity(description);
    if (check.hasProfanity) {
      toast.error('Please remove inappropriate language before submitting');
      setHasProfanity(true);
      setProfanityError(
        `Inappropriate language detected. Please remove the offensive word to continue.`
      );
      return;
    }

    if (description.trim().length < 10) {
      toast.error('Feedback description must be at least 10 characters');
      return;
    }

    setIsSubmitting(true);

    try {
      const requestBody: {
        email?: string;
        username?: string;
        userId?: string;
        category: string;
        description: string;
      } = {
        category,
        description: description.trim(),
      };

      // If logged in, use user info
      if (isLoggedIn && user) {
        requestBody.email = user.emailAddress || email.trim() || undefined;
        requestBody.username = user.username || undefined;
        requestBody.userId = user._id ? String(user._id) : undefined;
      } else {
        // If not logged in, require email
        if (!email.trim()) {
          toast.error('Please provide your email address');
          setIsSubmitting(false);
          return;
        }
        requestBody.email = email.trim();
      }

      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit feedback');
      }

      // Show thank you message
      setShowThankYou(true);

      // Reset form after a delay
      setTimeout(() => {
        setEmail('');
        setCategory('other');
        setDescription('');
        setShowThankYou(false);
        setProfanityError('');
        setHasProfanity(false);
        previousLengthRef.current = 0;
        onClose();
      }, 3000);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to submit feedback. Please try again later.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setEmail('');
      setCategory('other');
      setDescription('');
      setShowThankYou(false);
      setProfanityError('');
      setHasProfanity(false);
      previousLengthRef.current = 0;
      onClose();
    }
  };

  // Reset profanity state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setProfanityError('');
      setHasProfanity(false);
      previousLengthRef.current = 0;
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <AnimatePresence mode="wait">
          {!showThankYou ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-blue-600" />
                  Customer Feedback
                </DialogTitle>
                <DialogDescription>
                  We value your feedback! Please share any issues you&apos;ve found
                  or suggestions for improvement.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                {!isLoggedIn && (
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your.email@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      disabled={isSubmitting}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={category}
                    onValueChange={setCategory}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {FEEDBACK_CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    ref={textareaRef}
                    id="description"
                    placeholder="Please describe the issue or provide your feedback..."
                    value={description}
                    onChange={handleDescriptionChange}
                    onKeyDown={handleDescriptionKeyDown}
                    required
                    disabled={isSubmitting}
                    rows={6}
                    minLength={10}
                    maxLength={hasProfanity ? description.length : 5000}
                    className={`resize-none ${
                      hasProfanity ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''
                    }`}
                  />
                  {profanityError && (
                    <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-800">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>{profanityError}</span>
                    </div>
                  )}
                  <p className="text-xs text-gray-500">
                    {description.length}/5000 characters (minimum 10)
                  </p>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting || hasProfanity}>
                    {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                  </Button>
                </div>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="thankyou"
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.4, type: 'spring' }}
              className="flex flex-col items-center justify-center py-8 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              >
                <CheckCircle2 className="h-16 w-16 text-green-500" />
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-4 text-2xl font-bold text-gray-900"
              >
                Thank You!
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-2 text-gray-600"
              >
                We appreciate your feedback and will review it shortly.
              </motion.p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-4 text-sm text-gray-500"
              >
                This window will close automatically...
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
