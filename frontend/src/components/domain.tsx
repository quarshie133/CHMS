"use client";

import { Badge } from "@/components/ui/primitives";
import { humanize, MEMBER_STATUS } from "@/lib/format";

/** Status badge for a communication campaign (draft → queued → sending → sent / partially sent / needs review / failed). */
export function CampaignStatusBadge({ status }: { status: string }) {
  const tone =
    status === "sent"
      ? "success"
      : status === "failed"
        ? "danger"
        : status === "draft"
          ? "neutral"
          : status === "partially_sent" || status === "needs_review"
            ? "accent"
            : "warning";
  const label =
    { scheduled: "Queued", sending: "Sending", partially_sent: "Partially sent", needs_review: "Needs review" }[status] ??
    humanize(status);
  return (
    <Badge tone={tone} dot>
      {label}
    </Badge>
  );
}

export function MemberStatusBadge({ status }: { status: string }) {
  const st = MEMBER_STATUS[status] ?? { label: humanize(status) || "Unknown", tone: "neutral" as const };
  return (
    <Badge tone={st.tone} dot>
      {st.label}
    </Badge>
  );
}

const RECIPIENT_STATUS: Record<string, { label: string; tone: "neutral" | "brand" | "success" | "warning" | "danger" | "accent" }> = {
  pending: { label: "Pending", tone: "neutral" },
  sending: { label: "Sending", tone: "warning" },
  sent: { label: "Accepted by provider", tone: "brand" },
  delivered: { label: "Delivered", tone: "success" },
  simulated: { label: "Simulated (test mode)", tone: "neutral" },
  failed: { label: "Failed", tone: "danger" },
  bounced: { label: "Bounced", tone: "danger" },
  unknown: { label: "Unknown — needs review", tone: "accent" },
  skipped: { label: "Skipped", tone: "neutral" },
};

/** Per-recipient delivery status. "Sent" only means the provider accepted it. */
export function RecipientStatusBadge({ status }: { status: string }) {
  const s = RECIPIENT_STATUS[status] ?? { label: humanize(status), tone: "neutral" as const };
  return (
    <Badge tone={s.tone} dot>
      {s.label}
    </Badge>
  );
}
