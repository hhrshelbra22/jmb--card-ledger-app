import { getProfile } from "@/lib/supabase/profiles";

/**
 * Returns true if user has Pro or Dealer role.
 * Accounts for canceled subscriptions that are still within period.
 */
export async function isProUser(userId: string): Promise<boolean> {
  const profile = await getProfile(userId);
  if (!profile) return false;

  // dealer and admin always have pro access
  if (profile.role === "dealer" || profile.role === "admin") return true;

  // pro + active
  if (profile.role === "pro" && profile.subscription_status === "active") return true;

  // pro + canceled but still within period
  if (
    profile.role === "pro" &&
    profile.subscription_status === "canceled" &&
    profile.current_period_end &&
    new Date(profile.current_period_end) > new Date()
  ) return true;

  return false;
}

/** Converts array of objects to CSV string */
export function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h] ?? "";
          const str = String(val);
          // Wrap in quotes if contains comma, quote, or newline
          return str.includes(",") || str.includes('"') || str.includes("\n")
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        })
        .join(",")
    ),
  ];
  return lines.join("\n");
}

/** Returns a CSV NextResponse with proper headers */
export function csvResponse(csv: string, filename: string): Response {
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

/** Standard error handler for export routes */
export function exportError(error: unknown): Response {
  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error.message === "PRO_REQUIRED") {
      return Response.json(
        { error: "Pro subscription required to export data" },
        { status: 403 }
      );
    }
    return Response.json({ error: error.message }, { status: 400 });
  }
  return Response.json({ error: "Internal server error" }, { status: 500 });
}