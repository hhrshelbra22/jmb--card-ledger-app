"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { motion } from "motion/react";
import { Eye, EyeOff, CheckCircle2 } from "lucide-react";
import {
  AuthPageShell,
  authContainerVariants,
  authItemVariants,
} from "@/components/auth/AuthPageShell";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setDone(true);
    // Redirect to dashboard after 2s
    setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 2000);
  }

  return (
    <AuthPageShell
      title="Reset password"
      subtitle="Enter your new password below."
    >
      {done ? (
        // ── Success state ──
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-3 py-4 text-center"
        >
          <CheckCircle2 className="size-10 text-primary" />
          <p className="text-sm font-medium">Password updated!</p>
          <p className="text-xs text-muted-foreground">
            Redirecting you to the dashboard…
          </p>
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
          {/* New password */}
          <motion.div variants={authItemVariants}>
            <Label htmlFor="password" className="text-sm sm:text-base">
              New password
            </Label>
            <div className="relative mt-1.5">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

          {/* Confirm password */}
          <motion.div variants={authItemVariants}>
            <Label htmlFor="confirmPassword" className="text-sm sm:text-base">
              Confirm new password
            </Label>
            <div className="relative mt-1.5">
              <Input
                id="confirmPassword"
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
              {loading ? "Updating…" : "Update password"}
            </Button>
          </motion.div>
        </motion.form>
      )}
    </AuthPageShell>
  );
}