import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import type { LoginFormProps } from "@/shared/types/auth";

export default function LoginForm({
  identifier,
  setIdentifier,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  rememberMe,
  setRememberMe,
  errors,
  message,
  messageType,
  loading,
  redirecting,
  handleLogin,
}: LoginFormProps) {
  return (
    <>
      <div className="text-left">
        <h2 className="mb-6 text-2xl font-bold">Login</h2>
      </div>
      {message && (
        <div
          className={`mb-4 text-center text-sm font-medium ${
            messageType === "error" ? "text-destructive" : "text-greenHighlight"
          }`}
          role="alert"
          aria-live="polite"
        >
          {message}
        </div>
      )}
      <form onSubmit={handleLogin} className="space-y-6">
        <div>
          <Label htmlFor="identifier" className="text-gray-600">
            Email or Username
          </Label>
          <Input
            id="identifier"
            type="text"
            autoComplete="username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            disabled={loading || redirecting}
            aria-invalid={!!errors.identifier}
            aria-describedby={errors.identifier ? "identifier-error" : undefined}
            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2"
          />
          {errors.identifier && (
            <p className="text-destructive text-xs mt-1" id="identifier-error">
              {errors.identifier}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="password" className="text-gray-600">
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading || redirecting}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2"
            />
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setShowPassword(!showPassword);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {errors.password && (
            <p className="text-destructive text-xs mt-1" id="password-error">
              {errors.password}
            </p>
          )}
        </div>
        <div className="flex items-center">
          <input
            id="rememberMe"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            disabled={loading || redirecting}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          />
          <Label
            htmlFor="rememberMe"
            className="ml-2 text-sm text-gray-600 cursor-pointer"
          >
            Remember my email/username
          </Label>
        </div>
        <Button
          type="submit"
          disabled={loading || redirecting}
          className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
          aria-busy={loading || redirecting}
        >
          {loading || redirecting ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="animate-spin h-4 w-4 text-white"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
              {redirecting ? "Redirecting..." : "Logging in..."}
            </span>
          ) : (
            "Login"
          )}
        </Button>
      </form>
    </>
  );
}
