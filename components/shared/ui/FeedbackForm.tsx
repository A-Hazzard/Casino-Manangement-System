/**
 * Feedback Form Component
 * Modal form for submitting user feedback with validation and profanity filtering.
 *
 * @param isOpen - Whether the form modal is visible
 * @param onClose - Callback to close the form
 */
'use client';

import { Button } from '@/components/shared/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/shared/ui/dialog';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { Textarea } from '@/components/shared/ui/textarea';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, MessageSquare, Send, X } from 'lucide-react';
import { useState, useMemo, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import profaneWords from 'profane-words';
import { ADDITIONAL_BAD_WORDS } from '@/lib/constants';
import { useUserStore } from '@/lib/store/userStore';
import { cn } from '@/lib/utils';

// ============================================================================
// Constants
// ============================================================================

const FEEDBACK_CATEGORIES = [
  { value: 'bug',            label: 'Bug Report',       emoji: '🐛' },
  { value: 'suggestion',     label: 'Suggestion',        emoji: '💡' },
  { value: 'general-review', label: 'General Review',    emoji: '⭐' },
  { value: 'feature-request',label: 'Feature Request',   emoji: '✨' },
  { value: 'performance',    label: 'Performance',        emoji: '⚡' },
  { value: 'ui-ux',          label: 'UI / UX',            emoji: '🎨' },
  { value: 'other',          label: 'Other',              emoji: '📝' },
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
    profaneWords.forEach(word => allWords.add(word.toLowerCase()));
    ADDITIONAL_BAD_WORDS.forEach(word => allWords.add(word.toLowerCase()));
    return allWords;
  }, []);

  const checkProfanity = (text: string): { hasProfanity: boolean; badWord?: string } => {
    const words = text.toLowerCase().split(/\s+/);
    for (const word of words) {
      const cleanWord = word.replace(/[^\w]/g, '');
      if (cleanWord && badWordsSet.has(cleanWord)) {
        return { hasProfanity: true, badWord: cleanWord };
      }
    }
    return { hasProfanity: false };
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const currentLength = description.length;
    const newLength = newValue.length;
    const isBackspace = newLength < currentLength;

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

    if (hasProfanity && newLength > currentLength) {
      e.preventDefault();
      return;
    }

    const check = checkProfanity(newValue);
    if (check.hasProfanity) {
      setHasProfanity(true);
      setProfanityError('Inappropriate language detected. Please remove the offensive word to continue.');
      setDescription(newValue);
      previousLengthRef.current = newLength;
    } else {
      setHasProfanity(false);
      setProfanityError('');
      setDescription(newValue);
      previousLengthRef.current = newLength;
    }
  };

  const handleDescriptionKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const allowedKeys = ['Backspace','Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','Tab','Enter'];
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

    const check = checkProfanity(description);
    if (check.hasProfanity) {
      toast.error('Please remove inappropriate language before submitting');
      setHasProfanity(true);
      setProfanityError('Inappropriate language detected. Please remove the offensive word to continue.');
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
        firstName?: string;
        lastName?: string;
        licenceeId?: string;
        category: string;
        description: string;
      } = {
        category,
        description: description.trim(),
      };

      if (isLoggedIn && user) {
        requestBody.email = user.emailAddress || email.trim() || undefined;
        requestBody.username = user.username || undefined;
        requestBody.userId = user._id ? String(user._id) : undefined;
        requestBody.firstName = user.profile?.firstName || undefined;
        requestBody.lastName = user.profile?.lastName || undefined;
        requestBody.licenceeId = user.assignedLicencees?.[0] || undefined;
      } else {
        if (!email.trim()) {
          toast.error('Please provide your email address');
          setIsSubmitting(false);
          return;
        }
        requestBody.email = email.trim();
      }

      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit feedback');
      }

      setShowThankYou(true);

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
        error instanceof Error ? error.message : 'Failed to submit feedback. Please try again later.'
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

  useEffect(() => {
    if (!isOpen) {
      setProfanityError('');
      setHasProfanity(false);
      previousLengthRef.current = 0;
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        isMobileFullScreen={false}
        showCloseButton={false}
        className="flex max-h-[90vh] w-[calc(100%-2rem)] max-w-md flex-col overflow-hidden rounded-2xl p-0 shadow-2xl"
      >
        <AnimatePresence mode="wait">
          {!showThankYou ? (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col overflow-hidden"
            >
              <DialogTitle className="sr-only">Share Feedback</DialogTitle>
              {/* ── Header ── */}
              <div className="relative shrink-0 bg-gradient-to-br from-blue-600 to-indigo-700 px-6 pb-5 pt-5">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="absolute right-4 top-4 rounded-full p-1 text-white/60 transition-colors hover:bg-white/20 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/30">
                    <MessageSquare className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-white">Share Feedback</h2>
                    <p className="text-xs text-blue-200">Help us improve the platform</p>
                  </div>
                </div>
              </div>

              {/* ── Form body ── */}
              <form onSubmit={handleSubmit} className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
                {/* Email — only for guests */}
                {!isLoggedIn && (
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your.email@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      disabled={isSubmitting}
                      className="rounded-xl border-gray-200 text-sm focus:border-blue-400"
                    />
                  </div>
                )}

                {/* Category pills */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Category</p>
                  <div className="flex flex-wrap gap-2">
                    {FEEDBACK_CATEGORIES.map(cat => (
                      <button
                        key={cat.value}
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => setCategory(cat.value)}
                        className={cn(
                          'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                          category === cat.value
                            ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:bg-blue-50/50'
                        )}
                      >
                        <span>{cat.emoji}</span>
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label htmlFor="description" className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Description
                  </Label>
                  <Textarea
                    ref={textareaRef}
                    id="description"
                    placeholder="Describe the issue or share your thoughts…"
                    value={description}
                    onChange={handleDescriptionChange}
                    onKeyDown={handleDescriptionKeyDown}
                    required
                    disabled={isSubmitting}
                    rows={5}
                    minLength={10}
                    maxLength={hasProfanity ? description.length : 5000}
                    className={cn(
                      'resize-none rounded-xl border-gray-200 text-sm focus:border-blue-400',
                      hasProfanity && 'border-red-400 focus:border-red-400'
                    )}
                  />
                  {profanityError ? (
                    <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{profanityError}</span>
                    </div>
                  ) : (
                    <p className="text-right text-[11px] text-gray-400">
                      {description.length} / 5000
                    </p>
                  )}
                </div>
              </form>

              {/* ── Footer ── */}
              <div className="shrink-0 border-t bg-gray-50/80 px-6 py-4">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="text-gray-500"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSubmitting || hasProfanity}
                    onClick={handleSubmit}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Send className="mr-1.5 h-3.5 w-3.5" />
                    {isSubmitting ? 'Submitting…' : 'Submit'}
                  </Button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="thankyou"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, type: 'spring', stiffness: 200 }}
              className="flex flex-col items-center justify-center px-8 py-14 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 250 }}
                className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50"
              >
                <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-5 text-xl font-bold text-gray-900"
              >
                Thank you!
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-2 text-sm text-gray-500"
              >
                Your feedback has been received. We&apos;ll review it shortly.
              </motion.p>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="mt-5 text-xs text-gray-400"
              >
                This window will close automatically…
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
