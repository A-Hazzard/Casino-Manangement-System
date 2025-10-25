export type CollectionView = 'collection' | 'monthly' | 'manager' | 'collector';

export type CollectionTab = {
  id: CollectionView;
  label: string;
  icon: string;
  description?: string;
};
