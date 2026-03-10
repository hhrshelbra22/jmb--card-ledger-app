"use client";

import { useState, useEffect } from "react";
import { useProfile } from "@/lib/query/profile";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { User } from "lucide-react";
import { motion } from "motion/react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export default function ProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useProfile();

  // ── Personal info form state ──
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [country, setCountry] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // ── Security state ──
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);

  // Populate form when profile loads
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
      setPhone(profile.phone ?? "");
      setAddressLine1(profile.address_line1 ?? "");
      setAddressLine2(profile.address_line2 ?? "");
      setCity(profile.city ?? "");
      setState(profile.state ?? "");
      setZip(profile.zip ?? "");
      setCountry(profile.country ?? "");
    }
  }, [profile]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName || null,
          phone: phone || null,
          address_line1: addressLine1 || null,
          address_line2: addressLine2 || null,
          city: city || null,
          state: state || null,
          zip: zip || null,
          country: country || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to save");
      }
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile updated successfully.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setChangePasswordError(null);
    if (newPassword !== confirmPassword) {
      setChangePasswordError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setChangePasswordError("New password must be at least 6 characters.");
      return;
    }
    const email = profile?.email;
    if (!email) {
      setChangePasswordError("Email not found.");
      return;
    }
    setChangePasswordLoading(true);
    const supabase = createSupabaseBrowserClient();
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (signInError) {
        setChangePasswordError("Current password is incorrect.");
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        setChangePasswordError(updateError.message);
        return;
      }
      toast.success("Password updated successfully.");
      setChangePasswordOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setChangePasswordError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setChangePasswordLoading(false);
    }
  }

  function closeChangePasswordDialog(open: boolean) {
    if (!open) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setChangePasswordError(null);
    }
    setChangePasswordOpen(open);
  }

  if (isLoading) {
    return (
      <div className="p-3 sm:p-4 md:p-6 max-w-2xl mx-auto space-y-4 sm:space-y-6">
        <Skeleton className="h-7 sm:h-8 w-40 sm:w-48" />
        <div className="space-y-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <Skeleton className="h-16 w-16 sm:h-20 sm:w-20 rounded-full shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-40 sm:w-48" />
            </div>
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[75%]" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
    );
  }

  const planLabel =
    profile?.role === "pro" || profile?.role === "dealer" ? "PRO" : "FREE";

  return (
    <div className="p-3 sm:p-4 md:p-6 max-w-2xl mx-auto space-y-4 sm:space-y-5 md:space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-xl sm:text-2xl font-bold">Profile</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Manage your account settings
        </p>
      </motion.div>

      {/* ── Avatar + Email ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card className="p-4 sm:p-6 border-border rounded-xl">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
            <div className="flex flex-col items-center gap-2 sm:gap-3 shrink-0">
              <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full flex items-center justify-center bg-primary/20 text-primary">
                <User className="w-8 h-8 sm:w-12 sm:h-12" />
              </div>
              <Badge
                variant={planLabel === "PRO" ? "default" : "secondary"}
                className={
                  planLabel === "PRO"
                    ? "bg-primary/20 text-primary border-primary/30 text-xs"
                    : "bg-muted text-muted-foreground text-xs"
                }
              >
                {planLabel}
              </Badge>
            </div>

            <div className="flex-1 w-full space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm">Email</Label>
              <Input
                type="email"
                value={profile?.email ?? ""}
                disabled
                className="bg-muted h-8 sm:h-9 text-xs sm:text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                Email cannot be changed here.
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* ── Personal Info ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        <Card className="p-4 sm:p-6 border-border rounded-xl">
          <h3 className="font-medium text-sm sm:text-base mb-4">
            Personal Information
          </h3>
          <form onSubmit={handleSaveProfile} className="space-y-4">

            {/* Full Name */}
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">Full Name</Label>
              <Input
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="h-8 sm:h-9 text-xs sm:text-sm"
              />
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">Phone Number</Label>
              <Input
                type="tel"
                placeholder="+1 234 567 8900"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-8 sm:h-9 text-xs sm:text-sm"
              />
            </div>

            {/* Address Line 1 */}
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">Address Line 1</Label>
              <Input
                type="text"
                placeholder="123 Main St"
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                className="h-8 sm:h-9 text-xs sm:text-sm"
              />
            </div>

            {/* Address Line 2 */}
            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">
                Address Line 2{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                type="text"
                placeholder="Apt 4B"
                value={addressLine2}
                onChange={(e) => setAddressLine2(e.target.value)}
                className="h-8 sm:h-9 text-xs sm:text-sm"
              />
            </div>

            {/* City + State side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">City</Label>
                <Input
                  type="text"
                  placeholder="New York"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="h-8 sm:h-9 text-xs sm:text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">State</Label>
                <Input
                  type="text"
                  placeholder="NY"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="h-8 sm:h-9 text-xs sm:text-sm"
                />
              </div>
            </div>

            {/* Zip + Country side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">Zip / Postal Code</Label>
                <Input
                  type="text"
                  placeholder="10001"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  className="h-8 sm:h-9 text-xs sm:text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">Country</Label>
                <Input
                  type="text"
                  placeholder="United States"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="h-8 sm:h-9 text-xs sm:text-sm"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={savingProfile}
              className="h-8 sm:h-9 text-xs sm:text-sm"
            >
              {savingProfile ? "Saving…" : "Save Changes"}
            </Button>
          </form>
        </Card>
      </motion.div>

      {/* ── Security ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Card className="p-4 sm:p-6 border-border rounded-xl space-y-3 sm:space-y-4">
          <h3 className="font-medium text-sm sm:text-base">Security</h3>
          <Button
            onClick={() => setChangePasswordOpen(true)}
            variant="outline"
            className="h-8 sm:h-9 text-xs sm:text-sm"
          >
            Change Password
          </Button>
        </Card>
      </motion.div>

      {/* ── Actions ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
      >
        <Card className="p-4 sm:p-6 border-border rounded-xl space-y-3 sm:space-y-4">
          <h3 className="font-medium text-sm sm:text-base">Actions</h3>
          <Button
            variant="outline"
            className="w-full justify-start h-8 sm:h-9 text-xs sm:text-sm"
            onClick={() => setLogoutConfirm(true)}
          >
            Log Out
          </Button>
        </Card>
      </motion.div>

      {/* ── Change Password Dialog ── */}
      <Dialog open={changePasswordOpen} onOpenChange={closeChangePasswordDialog}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Change Password</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-3 sm:space-y-4">
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm">Current password</Label>
              <Input
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="h-8 sm:h-9 text-xs sm:text-sm"
                placeholder="Enter current password"
              />
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm">New password</Label>
              <Input
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="h-8 sm:h-9 text-xs sm:text-sm"
                placeholder="At least 6 characters"
              />
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm">Confirm new password</Label>
              <Input
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="h-8 sm:h-9 text-xs sm:text-sm"
                placeholder="Confirm new password"
              />
            </div>
            {changePasswordError && (
              <p className="text-xs text-destructive">{changePasswordError}</p>
            )}
            <div className="flex gap-2 sm:gap-3 pt-1">
              <Button
                type="button"
                variant="ghost"
                className="h-8 sm:h-9 text-xs sm:text-sm"
                onClick={() => closeChangePasswordDialog(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={changePasswordLoading}
                className="h-8 sm:h-9 text-xs sm:text-sm"
              >
                {changePasswordLoading ? "Updating…" : "Update password"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Logout Confirm Dialog ── */}
      <Dialog open={logoutConfirm} onOpenChange={setLogoutConfirm}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              Log out of JMB Card Ledger?
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs sm:text-sm text-muted-foreground">
            You will need to log in again to access your account.
          </p>
          <div className="flex gap-2 sm:gap-3 pt-1 sm:pt-2">
            <Button
              variant="ghost"
              className="h-8 sm:h-9 text-xs sm:text-sm"
              onClick={() => setLogoutConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90 h-8 sm:h-9 text-xs sm:text-sm"
              onClick={() => { setLogoutConfirm(false); handleSignOut(); }}
            >
              Log Out
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}