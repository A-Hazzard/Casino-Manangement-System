'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { EditCountryModalProps } from '@/lib/types/components';

export default function EditCountryModal({
  isOpen,
  onClose,
  country,
}: EditCountryModalProps) {
  const [formState, setFormState] = useState({
    name: '',
    alpha2: '',
    alpha3: '',
    isoNumeric: '',
  });

  useEffect(() => {
    if (country) {
      setFormState({
        name: country.name || '',
        alpha2: country.alpha2 || '',
        alpha3: country.alpha3 || '',
        isoNumeric: country.isoNumeric || '',
      });
    }
  }, [country]);

  if (!country) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormState({ ...formState, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formState.name ||
      !formState.alpha2 ||
      !formState.alpha3 ||
      !formState.isoNumeric
    ) {
      alert('All fields are required');
      return;
    }
    // Handle save logic here
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Country</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              type="text"
              name="name"
              value={formState.name || ''}
              onChange={handleChange}
              required
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="alpha2">Alpha 2</Label>
              <Input
                id="alpha2"
                type="text"
                name="alpha2"
                value={formState.alpha2 || ''}
                onChange={handleChange}
                maxLength={2}
                required
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="alpha3">Alpha 3</Label>
              <Input
                id="alpha3"
                type="text"
                name="alpha3"
                value={formState.alpha3 || ''}
                onChange={handleChange}
                maxLength={3}
                required
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="isoNumeric">ISO</Label>
              <Input
                id="isoNumeric"
                type="text"
                name="isoNumeric"
                value={formState.isoNumeric || ''}
                onChange={handleChange}
                maxLength={3}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
