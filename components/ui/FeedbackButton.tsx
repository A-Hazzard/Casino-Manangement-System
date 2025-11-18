'use client';

import { Button } from '@/components/ui/button';
import FeedbackForm from '@/components/ui/FeedbackForm';
import { motion } from 'framer-motion';
import { MessageSquare } from 'lucide-react';
import { useState } from 'react';

export default function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div
        className="fixed bottom-6 right-6 z-[100]"
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          zIndex: 100,
        }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
        >
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={() => setIsOpen(true)}
              className="h-14 w-14 rounded-full bg-blue-600 shadow-lg hover:bg-blue-700"
              size="icon"
              aria-label="Provide feedback"
            >
              <MessageSquare className="h-6 w-6 text-white" />
            </Button>
          </motion.div>
        </motion.div>
      </div>
      <FeedbackForm isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
