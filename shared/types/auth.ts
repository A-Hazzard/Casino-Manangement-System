export type LoginFormProps = {
  identifier: string; // email or username
  setIdentifier: (value: string) => void;
  password: string;
  setPassword: (password: string) => void;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  errors: { identifier?: string; password?: string };
  message: string;
  messageType: "error" | "success" | "";
  loading: boolean;
  redirecting: boolean;
  handleLogin: (e: React.FormEvent) => Promise<void>;
  setErrors: (errors: { identifier?: string; password?: string }) => void;
  setMessage: (message: string) => void;
  setMessageType: (type: "error" | "success" | "") => void;
};
