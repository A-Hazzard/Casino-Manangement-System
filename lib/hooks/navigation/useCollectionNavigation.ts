import { useRouter, useSearchParams } from 'next/navigation';
import type { CollectionView, CollectionTab } from '@/lib/types/collection';

export function useCollectionNavigation(tabs: CollectionTab[]) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // state is kept local in page, so this hook only provides helpers
  const ensureValidView = (view: string | null): CollectionView => {
    const valid = tabs.map(t => t.id) as CollectionView[];
    if (view && valid.includes(view as CollectionView))
      return view as CollectionView;
    return 'collection' as CollectionView;
  };

  const readFromUrl = (): CollectionView => {
    const from = searchParams?.get('section');
    return ensureValidView(from);
  };

  const pushToUrl = (view: CollectionView) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('section', view);
    const newUrl = `/collection-report?${params.toString()}`;
    router.push(newUrl, { scroll: false });
  };

  return { readFromUrl, pushToUrl, ensureValidView };
}
