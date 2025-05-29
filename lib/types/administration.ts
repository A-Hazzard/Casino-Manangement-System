export type User = {
  name: string;
  username: string;
  email: string;
  enabled: boolean;
  roles: string[];
  profilePicture: string | null;
  // Add any other user-specific fields that might come from an API
};

export type SortKey = keyof User | null;
