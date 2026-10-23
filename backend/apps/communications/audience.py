"""
Campaign audiences.

`recipients_filter` stores an allow-listed audience spec (never raw ORM lookups):

    {"type": "active"}                                active members
    {"type": "everyone"}                              active, visitors and inactive
    {"type": "visitors"}
    {"type": "group", "group_id": "<uuid>"}           active members of one group
    {"type": "life_stage", "life_stage": "adult"}     active members in a life stage
    {"type": "members", "member_ids": ["<uuid>", …]}  hand-picked people
    {"type": "phone", "phone": "+233…", "name": ""}   one ad-hoc number (SMS only)
"""

from __future__ import annotations

import re
import uuid
from dataclasses import dataclass, field

from rest_framework import serializers

from apps.members.models import LifeStage, Member

from .sms.phone import InvalidPhoneNumber, normalize_ghana_phone

AUDIENCE_TYPES = ("active", "everyone", "visitors", "group", "life_stage", "members", "phone")
MAX_PICKED_MEMBERS = 1000
_EMAIL = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def _uuid(value, label):
    try:
        return str(uuid.UUID(str(value)))
    except (TypeError, ValueError, AttributeError):
        raise serializers.ValidationError(f"{label} must be a valid id.")


def _from_legacy(spec: dict) -> dict:
    """Map filters saved by the earlier UI ({"status": "active"} etc.) to the typed format."""
    if not spec:
        return {"type": "everyone"}
    if spec.get("group_memberships__group_id"):
        return {"type": "group", "group_id": spec["group_memberships__group_id"]}
    if spec.get("life_stage"):
        return {"type": "life_stage", "life_stage": spec["life_stage"]}
    if spec.get("status") == "visitor":
        return {"type": "visitors"}
    if spec.get("status__in"):
        return {"type": "everyone"}
    if spec.get("status") == "active":
        return {"type": "active"}
    raise serializers.ValidationError("Unsupported audience.")


def validate_audience(spec, channel: str) -> dict:
    if not isinstance(spec, dict):
        raise serializers.ValidationError("Audience must be an object.")
    if "type" not in spec:
        spec = _from_legacy(spec)
    kind = spec.get("type")
    if kind not in AUDIENCE_TYPES:
        raise serializers.ValidationError(f"Unknown audience type. Use one of: {', '.join(AUDIENCE_TYPES)}.")

    if kind == "group":
        return {"type": "group", "group_id": _uuid(spec.get("group_id"), "group_id")}
    if kind == "life_stage":
        stage = spec.get("life_stage")
        if stage not in LifeStage.values:
            raise serializers.ValidationError("Unknown life stage.")
        return {"type": "life_stage", "life_stage": stage}
    if kind == "members":
        ids = spec.get("member_ids")
        if not isinstance(ids, list) or not ids:
            raise serializers.ValidationError("Choose at least one person.")
        if len(ids) > MAX_PICKED_MEMBERS:
            raise serializers.ValidationError(f"Choose at most {MAX_PICKED_MEMBERS} people, or use a group.")
        return {"type": "members", "member_ids": sorted({_uuid(i, "member_ids") for i in ids})}
    if kind == "phone":
        if channel != "sms":
            raise serializers.ValidationError("A single phone number audience is only available for SMS.")
        try:
            phone = normalize_ghana_phone(spec.get("phone"))
        except InvalidPhoneNumber as exc:
            raise serializers.ValidationError(str(exc))
        name = str(spec.get("name") or "")[:200]
        return {"type": "phone", "phone": phone, "name": name}
    return {"type": kind}


def audience_queryset(spec: dict):
    kind = spec["type"]
    qs = Member.objects.all()
    if kind == "active":
        return qs.filter(status="active")
    if kind == "everyone":
        return qs.filter(status__in=["active", "visitor", "inactive"])
    if kind == "visitors":
        return qs.filter(status="visitor")
    if kind == "group":
        return qs.filter(group_memberships__group_id=spec["group_id"], group_memberships__is_active=True).distinct()
    if kind == "life_stage":
        return qs.filter(status="active", life_stage=spec["life_stage"])
    if kind == "members":
        return qs.filter(id__in=spec["member_ids"])
    return qs.none()


@dataclass
class Candidate:
    member_id: str | None
    name: str
    address: str


@dataclass
class Resolution:
    matched: int = 0
    valid: list[Candidate] = field(default_factory=list)
    invalid: list[Candidate] = field(default_factory=list)  # has a value, but it's not a valid number/email
    missing: list[Candidate] = field(default_factory=list)  # no phone/email on file
    duplicates: int = 0  # extra people sharing an already-included number/email

    def summary(self, sample: int = 20) -> dict:
        return {
            "matched": self.matched,
            "recipients": len(self.valid),
            "invalid": len(self.invalid),
            "missing_contact": len(self.missing),
            "duplicates_removed": self.duplicates,
            "invalid_sample": [{"member_id": c.member_id, "name": c.name} for c in self.invalid[:sample]],
        }


def resolve_audience(spec: dict, channel: str) -> Resolution:
    res = Resolution()
    if spec["type"] == "phone":
        res.matched = 1
        res.valid.append(Candidate(None, spec.get("name") or "", spec["phone"]))
        return res

    seen: set[str] = set()
    rows = audience_queryset(spec).values("id", "first_name", "last_name", "phone_mobile", "email").order_by("last_name", "first_name")
    for row in rows.iterator():
        res.matched += 1
        name = f"{row['first_name']} {row['last_name']}".strip()
        raw = (row["phone_mobile"] if channel == "sms" else row["email"]) or ""
        cand = Candidate(str(row["id"]), name, raw.strip())
        if not cand.address:
            res.missing.append(cand)
            continue
        if channel == "sms":
            try:
                cand.address = normalize_ghana_phone(cand.address)
            except InvalidPhoneNumber:
                res.invalid.append(cand)
                continue
        else:
            cand.address = cand.address.lower()
            if not _EMAIL.match(cand.address):
                res.invalid.append(cand)
                continue
        if cand.address in seen:
            res.duplicates += 1
            continue
        seen.add(cand.address)
        res.valid.append(cand)
    return res


def describe_audience(spec: dict) -> str:
    kind = spec.get("type") if isinstance(spec, dict) else None
    return {
        "active": "Active members",
        "everyone": "Whole directory",
        "visitors": "Visitors",
        "group": "A group",
        "life_stage": f"Life stage: {spec.get('life_stage', '')}",
        "members": f"{len(spec.get('member_ids', []))} selected people" if kind == "members" else "",
        "phone": "Single number",
    }.get(kind or "", "Custom audience")
