"use client";

import { Badge } from "@/components/ui/primitives";
import { humanize, MEMBER_STATUS } from "@/lib/format";

/** Status badge for a communication campaign (draft → scheduled → sending → sent/failed). */
export function CampaignStatusBadge({ status }: { status: string }) {
  const tone =
    status === "sent" ? "success" : status === "failed" ? "danger" : status === "draft" ? "neutral" : "warning";
  const label = status === "scheduled" ? "Queued" : humanize(status);
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
