"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { motion } from "motion/react";
import { MailCheck, Eye, EyeOff } from "lucide-react";
import {
  AuthPageShell,
  authContainerVariants,
  authItemVariants,
} from "@/components/auth/AuthPageShell";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  function validate(): string | null {
    if (!email.trim()) return "Email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return "Enter a valid email address.";
    if (password.length < 6)
      return "Password must be at least 6 characters.";
    if (!/[A-Z]/.test(password) && !/[0-9]/.test(password))
      return "Password must contain at least one number or uppercase letter.";
    if (password !== confirmPassword)
      return "Passwords do not match.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });
    setLoading(false);

    if (err) {
      setError(err.message);
      return;
    }

    // Supabase silently "succeeds" for existing emails (prevents email enumeration)
    // Detect duplicate: user exists but has no new identity created
    if (data.user && data.user.identities?.length === 0) {
      setError(
        "An account with this email already exists. Try signing in instead."
      );
      return;
    }

    if (data.session) {
      // Email confirmation disabled — go straight to dashboard
      router.push("/dashboard");
      router.refresh();
    } else {
      // Email confirmation enabled — show check inbox message
      setConfirmed(true);
    }
  }

  return (
    <AuthPageShell
      title="Create account"
      subtitle="Sign up to start tracking your card inventory and sales."
    >
      {confirmed ? (
        // ── Check email state ──
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center gap-3 py-4 text-center"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <MailCheck className="size-12 text-primary" />
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-base font-semibold"
          >
            Check your inbox
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-sm text-muted-foreground max-w-xs leading-relaxed"
          >
            We sent a confirmation link to{" "}
            <span className="font-medium text-foreground">{email}</span>.
            Click the link in the email to activate your account.
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
            className="text-xs text-muted-foreground"
          >
            Didn&apos;t receive it? Check your spam folder.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
          >
            <Link
              href="/login"
              className="mt-1 text-xs font-medium text-primary hover:underline underline-offset-2"
            >
              Back to sign in
            </Link>
          </motion.div>
        </motion.div>
      ) : (
        // ── Signup form ──
        <motion.form
          onSubmit={handleSubmit}
          className="space-y-4 w-full max-w-sm mx-auto sm:max-w-md px-4 sm:px-0"
          variants={authContainerVariants}
          initial="hidden"
          animate="show"
        >
          {/* Email */}
          <motion.div variants={authItemVariants}>
            <Label htmlFor="email" className="text-sm sm:text-base">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); }}
              required
              placeholder="you@example.com"
              className="mt-1.5 transition-all focus:ring-2 focus:ring-primary/20 h-10 sm:h-11 text-sm sm:text-base"
            />
          </motion.div>

          {/* Password */}
          <motion.div variants={authItemVariants}>
            <Label htmlFor="password" className="text-sm sm:text-base">
              Password
            </Label>
            <div className="relative mt-1.5">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }}
                required
                minLength={6}
                placeholder="Min. 6 characters"
                className="pr-10 transition-all focus:ring-2 focus:ring-primary/20 h-10 sm:h-11 text-sm sm:text-base"
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>
          </motion.div>

          {/* Confirm Password */}
          <motion.div variants={authItemVariants}>
            <Label htmlFor="confirmPassword" className="text-sm sm:text-base">
              Confirm password
            </Label>
            <div className="relative mt-1.5">
              <Input
                id="confirmPassword"
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                required
                placeholder="Re-enter password"
                className="pr-10 transition-all focus:ring-2 focus:ring-primary/20 h-10 sm:h-11 text-sm sm:text-base"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((p) => !p)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                aria-label={showConfirm ? "Hide password" : "Show password"}
              >
                {showConfirm ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>
          </motion.div>

          {/* Error — with inline sign in link if duplicate email */}
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs sm:text-sm text-destructive"
            >
              {error}
              {error.includes("already exists") && (
                <>
                  {" "}
                  <Link
                    href="/login"
                    className="font-medium underline underline-offset-2 hover:opacity-80"
                  >
                    Sign in
                  </Link>
                </>
              )}
            </motion.p>
          )}

          <motion.div variants={authItemVariants}>
            <Button
              type="submit"
              className="w-full font-medium h-10 sm:h-11 text-sm sm:text-base"
              disabled={loading}
            >
              {loading ? "Creating account…" : "Sign up"}
            </Button>
          </motion.div>
        </motion.form>
      )}

      {!confirmed && (
        <motion.p
          variants={authItemVariants}
          className="mt-6 text-center text-xs sm:text-sm text-muted-foreground px-4 sm:px-0"
        >
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-primary hover:underline underline-offset-2"
          >
            Sign in
          </Link>
        </motion.p>
      )}
    </AuthPageShell>
  );
}