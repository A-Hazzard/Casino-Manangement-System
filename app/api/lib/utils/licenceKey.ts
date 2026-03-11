import { Licencee } from '@/app/api/lib/models/licencee';

// Helper function to generate a unique licence key
function generateLicenceKey(): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `LIC-${timestamp}-${randomStr}`.toUpperCase();
}

// Helper function to ensure unique licence key
export async function generateUniqueLicenceKey(): Promise<string> {
  let licenceKey: string;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 10;

  while (!isUnique && attempts < maxAttempts) {
    licenceKey = generateLicenceKey();
    const existing = await Licencee.findOne({ licenceKey });
    if (!existing) {
      isUnique = true;
      return licenceKey;
    }
    attempts++;
  }

  // Fallback with UUID-like structure if all attempts fail
  const fallbackKey = `LIC-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 15)}`.toUpperCase();
  return fallbackKey;
}

