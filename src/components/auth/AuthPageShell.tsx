"use client";

import Link from "next/link";
import { motion } from "motion/react";

export const authContainerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

export const authItemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

interface AuthPageShellProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export function AuthPageShell({ children, title, subtitle }: AuthPageShellProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 relative overflow-hidden bg-background">
      {/* Animated gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-1/2 -left-1/2 w-full h-full rounded-full opacity-[0.15] dark:opacity-[0.12] blur-3xl"
          style={{ background: "var(--primary)" }}
          animate={{
            x: [0, 80, 0],
            y: [0, 40, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-1/2 -right-1/2 w-full h-full rounded-full opacity-[0.12] dark:opacity-[0.1] blur-3xl"
          style={{ background: "var(--secondary)" }}
          animate={{
            x: [0, -60, 0],
            y: [0, -30, 0],
            scale: [1, 1.15, 1],
          }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.08] dark:opacity-[0.06] blur-3xl"
          style={{ background: "var(--accent)" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.4] dark:opacity-[0.15] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(var(--border) 1px, transparent 1px),
            linear-gradient(90deg, var(--border) 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />

      <motion.div
        className="relative w-full max-w-[420px]"
        initial="hidden"
        animate="show"
        variants={authContainerVariants}
      >
        {/* Animated card */}
        <motion.div
          variants={authItemVariants}
          className="relative rounded-2xl border border-border bg-card text-card-foreground shadow-xl dark:shadow-2xl overflow-hidden"
          style={{
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.15), 0 0 0 1px var(--border), 0 0 40px -10px rgba(0,229,255,0.12)",
          }}
        >
          {/* Top accent line */}
          <motion.div
            className="absolute top-0 left-0 right-0 h-1 origin-left"
            style={{
              background: "linear-gradient(90deg, var(--primary), var(--secondary))",
            }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />

          <div className="p-6 sm:p-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
              <span className="font-semibold text-foreground">JMB Card Ledger</span>
            </Link>

            <motion.h1
              variants={authItemVariants}
              className="text-2xl sm:text-3xl font-bold tracking-tight mb-2"
            >
              {title}
            </motion.h1>
            <motion.p
              variants={authItemVariants}
              className="text-muted-foreground text-sm mb-6"
            >
              {subtitle}
            </motion.p>

            {children}
          </div>
        </motion.div>

        {/* Floating decorative cards (visual only) */}
        <motion.div
          className="absolute -z-10 top-1/4 -right-8 w-16 h-20 rounded-lg border border-primary/30 bg-card/50 dark:bg-card/30"
          style={{ transform: "rotate(12deg)" }}
          animate={{ y: [0, -8, 0], rotate: [12, 14, 12] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -z-10 bottom-1/4 -left-6 w-12 h-16 rounded-md border border-secondary/30 bg-card/50 dark:bg-card/30"
          style={{ transform: "rotate(-8deg)" }}
          animate={{ y: [0, 6, 0], rotate: [-8, -6, -8] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
    </div>
  );
}
