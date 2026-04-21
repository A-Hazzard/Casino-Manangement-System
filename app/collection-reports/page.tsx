import { redirect } from 'next/navigation';

// Redirect to the collect page if user types in the wrong URL
export default function Page() {
  redirect('/collection-report');
  return null;
}

