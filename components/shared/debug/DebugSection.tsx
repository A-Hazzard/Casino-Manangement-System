/**
 * Debug Section Component
 * 
 * A small utility component for developers to inspect the raw data of a section.
 * Only visible to users with the 'developer' role.
 * 
 * @module components/shared/debug/DebugSection
 */
'use client';

import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/shared/ui/dialog';
import { useUserStore } from '@/lib/store/userStore';
import { Bug, Database } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

type DebugSectionProps = {
  title: string;
  data: any;
  className?: string;
};

export default function DebugSection({ title, data, className }: DebugSectionProps) {
  const { user } = useUserStore();
  const [isOpen, setIsOpen] = useState(false);
  
  const isDeveloper = user?.roles?.includes('developer');

  if (!isDeveloper) return null;

  return (
    <div className={className}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="h-6 w-6 p-0 text-violet-400 hover:text-violet-600 hover:bg-violet-50"
        title={`Debug ${title}`}
      >
        <Bug className="h-3.5 w-3.5" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-violet-600" />
              <span>Debug View: {title}</span>
              <Badge variant="outline" className="ml-2 border-violet-200 text-violet-600">Dev Only</Badge>
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto mt-4 p-4 bg-gray-900 rounded-lg">
            <pre className="text-[11px] font-mono text-emerald-400 leading-relaxed">
              {(() => {
                try {
                  const cache = new Set();
                  return JSON.stringify(data, (key, value) => {
                    if (typeof value === 'object' && value !== null) {
                      if (cache.has(value)) return '[Circular]';
                      cache.add(value);
                    }
                    // Skip React components/nodes which usually have $$typeof or are functions
                    if (value?.$$typeof || typeof value === 'function') {
                      return undefined;
                    }
                    return value;
                  }, 2);
                } catch (err) {
                  return `Error stringifying data: ${err instanceof Error ? err.message : String(err)}`;
                }
              })()}
            </pre>
          </div>
          
          <div className="mt-4 flex justify-between items-center text-[10px] text-gray-500 font-mono">
            <span>Timestamp: {new Date().toISOString()}</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                const cache = new Set();
                const safeJson = JSON.stringify(data, (key, value) => {
                  if (typeof value === 'object' && value !== null) {
                    if (cache.has(value)) return '[Circular]';
                    cache.add(value);
                  }
                  if (value?.$$typeof || typeof value === 'function') return undefined;
                  return value;
                }, 2);
                navigator.clipboard.writeText(safeJson);
                toast.success('JSON copied to clipboard');
              }}
              className="text-[10px] h-7"
            >
              Copy JSON
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
