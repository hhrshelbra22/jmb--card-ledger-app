"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { motion } from "motion/react";
import { CheckCircle2 } from "lucide-react";
import {
  AuthPageShell,
  authContainerVariants,
  authItemVariants,
} from "@/components/auth/AuthPageShell";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSent(true);
  }

  return (
    <AuthPageShell
      title="Forgot password"
      subtitle="Enter your email and we'll send you a reset link."
    >
      {sent ? (
        // ── Success state ──
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-3 py-4 text-center"
        >
          <CheckCircle2 className="size-10 text-primary" />
          <p className="text-sm font-medium">Check your inbox</p>
          <p className="text-xs text-muted-foreground max-w-xs">
            We sent a password reset link to{" "}
            <span className="font-medium text-foreground">{email}</span>.
            Check your spam folder if you don&apos;t see it.
          </p>
          <Link
            href="/login"
            className="mt-2 text-xs font-medium text-primary hover:underline underline-offset-2"
          >
            Back to sign in
          </Link>
        </motion.div>
      ) : (
        // ── Form state ──
        <motion.form
          onSubmit={handleSubmit}
          className="space-y-4 w-full"
          variants={authContainerVariants}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={authItemVariants}>
            <Label htmlFor="email" className="text-sm sm:text-base">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="mt-1.5 transition-all focus:ring-2 focus:ring-primary/20 h-10 sm:h-11 text-sm sm:text-base"
            />
          </motion.div>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs sm:text-sm text-destructive"
            >
              {error}
            </motion.p>
          )}

          <motion.div variants={authItemVariants}>
            <Button
              type="submit"
              className="w-full font-medium h-10 sm:h-11 text-sm sm:text-base"
              disabled={loading}
            >
              {loading ? "Sending…" : "Send reset link"}
            </Button>
          </motion.div>

          <motion.p
            variants={authItemVariants}
            className="text-center text-xs sm:text-sm text-muted-foreground"
          >
            Remember your password?{" "}
            <Link
              href="/login"
              className="font-medium text-primary hover:underline underline-offset-2"
            >
              Sign in
            </Link>
          </motion.p>
        </motion.form>
      )}
    </AuthPageShell>
  );
}