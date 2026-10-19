"use client";

import { Field, FormSection, Input, Select, Textarea } from "@/components/ui/form";
import type { Family, MemberDetail } from "@/lib/api";
import { fieldError } from "@/lib/api";
import { GENDERS, LIFE_STAGES, MARITAL_STATUSES, MEMBER_STATUS } from "@/lib/format";

export interface MemberFormValues {
  first_name: string;
  last_name: string;
  middle_name: string;
  preferred_name: string;
  gender: string;
  date_of_birth: string;
  marital_status: string;
  email: string;
  phone_mobile: string;
  phone_home: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  status: string;
  life_stage: string;
  membership_date: string;
  baptism_date: string;
  family_id: string;
  occupation: string;
  employer: string;
  notes: string;
}

export const emptyMember: MemberFormValues = {
  first_name: "",
  last_name: "",
  middle_name: "",
  preferred_name: "",
  gender: "",
  date_of_birth: "",
  marital_status: "",
  email: "",
  phone_mobile: "",
  phone_home: "",
  address: "",
  city: "",
  state: "",
  postal_code: "",
  country: "",
  status: "active",
  life_stage: "adult",
  membership_date: "",
  baptism_date: "",
  family_id: "",
  occupation: "",
  employer: "",
  notes: "",
};

export function memberToForm(m: MemberDetail): MemberFormValues {
  return {
    first_name: m.first_name ?? "",
    last_name: m.last_name ?? "",
    middle_name: m.middle_name ?? "",
    preferred_name: m.preferred_name ?? "",
    gender: m.gender ?? "",
    date_of_birth: m.date_of_birth ?? "",
    marital_status: m.marital_status ?? "",
    email: m.email ?? "",
    phone_mobile: m.phone_mobile ?? "",
    phone_home: m.phone_home ?? "",
    address: m.address ?? "",
    city: m.city ?? "",
    state: m.state ?? "",
    postal_code: m.postal_code ?? "",
    country: m.country ?? "",
    status: m.status || "active",
    life_stage: m.life_stage ?? "",
    membership_date: m.membership_date ?? "",
    baptism_date: m.baptism_date ?? "",
    family_id: m.family?.id ?? "",
    occupation: m.occupation ?? "",
    employer: m.employer ?? "",
    notes: m.notes ?? "",
  };
}

/** Convert form values to the payload the members API accepts. */
export function formToPayload(v: MemberFormValues, fields?: Array<keyof MemberFormValues>): Record<string, unknown> {
  const keys = fields ?? (Object.keys(v) as Array<keyof MemberFormValues>);
  const dateKeys = new Set(["date_of_birth", "membership_date", "baptism_date"]);
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    const raw = typeof v[k] === "string" ? v[k].trim() : v[k];
    if (k === "family_id") out.family_id = raw || null;
    else if (dateKeys.has(k)) out[k] = raw || null;
    else out[k] = raw;
  }
  return out;
}

export interface MemberFormErrors {
  first_name?: string;
  last_name?: string;
  email?: string;
}

export function validateMember(v: MemberFormValues): MemberFormErrors {
  const e: MemberFormErrors = {};
  if (!v.first_name.trim()) e.first_name = "First name is required.";
  if (!v.last_name.trim()) e.last_name = "Last name is required.";
  if (v.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) e.email = "Enter a valid email address.";
  return e;
}

/** The fields used by the quick add / edit dialog. */
export const QUICK_FIELDS: Array<keyof MemberFormValues> = [
  "first_name",
  "last_name",
  "email",
  "phone_mobile",
  "status",
  "life_stage",
  "family_id",
];

type Setter = <K extends keyof MemberFormValues>(key: K, value: MemberFormValues[K]) => void;

interface SectionProps {
  values: MemberFormValues;
  set: Setter;
  errors: MemberFormErrors;
  apiError?: unknown;
  disabled?: boolean;
}

function err(errors: MemberFormErrors, apiError: unknown, key: keyof MemberFormValues) {
  return (errors as Record<string, string | undefined>)[key] ?? fieldError(apiError, key);
}

export function NameFields({ values, set, errors, apiError, disabled }: SectionProps) {
  return (
    <>
      <Field label="First name" required error={err(errors, apiError, "first_name")}>
        {(p) => (
          <Input {...p} autoComplete="given-name" value={values.first_name} disabled={disabled} onChange={(e) => set("first_name", e.target.value)} />
        )}
      </Field>
      <Field label="Last name" required error={err(errors, apiError, "last_name")}>
        {(p) => (
          <Input {...p} autoComplete="family-name" value={values.last_name} disabled={disabled} onChange={(e) => set("last_name", e.target.value)} />
        )}
      </Field>
    </>
  );
}

export function ContactFields({ values, set, errors, apiError, disabled }: SectionProps) {
  return (
    <>
      <Field label="Email" error={err(errors, apiError, "email")}>
        {(p) => (
          <Input {...p} type="email" autoComplete="email" placeholder="name@example.com" value={values.email} disabled={disabled} onChange={(e) => set("email", e.target.value)} />
        )}
      </Field>
      <Field label="Mobile phone" hint="Used for SMS broadcasts" error={err(errors, apiError, "phone_mobile")}>
        {(p) => (
          <Input {...p} type="tel" autoComplete="tel" value={values.phone_mobile} disabled={disabled} onChange={(e) => set("phone_mobile", e.target.value)} />
        )}
      </Field>
    </>
  );
}

export function MembershipFields({
  values,
  set,
  errors,
  apiError,
  disabled,
  families,
}: SectionProps & { families: Family[] }) {
  return (
    <>
      <Field label="Membership status" error={err(errors, apiError, "status")}>
        {(p) => (
          <Select {...p} value={values.status} disabled={disabled} onChange={(e) => set("status", e.target.value)}>
            {Object.entries(MEMBER_STATUS).map(([value, s]) => (
              <option key={value} value={value}>
                {s.label}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Life stage" error={err(errors, apiError, "life_stage")}>
        {(p) => (
          <Select {...p} value={values.life_stage} disabled={disabled} onChange={(e) => set("life_stage", e.target.value)}>
            <option value="">Not specified</option>
            {LIFE_STAGES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="Household" hint="Link this person to an existing family" className="sm:col-span-2" error={err(errors, apiError, "family_id")}>
        {(p) => (
          <Select {...p} value={values.family_id} disabled={disabled} onChange={(e) => set("family_id", e.target.value)}>
            <option value="">No household</option>
            {families.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
                {f.member_count ? ` (${f.member_count})` : ""}
              </option>
            ))}
          </Select>
        )}
      </Field>
    </>
  );
}

/** Full profile form used on the Add person page and the profile edit dialog. */
export function MemberFullForm({
  values,
  set,
  errors,
  apiError,
  disabled,
  families,
}: SectionProps & { families: Family[] }) {
  const props = { values, set, errors, apiError, disabled };
  return (
    <div className="flex flex-col gap-8">
      <FormSection title="Personal details" description="Name and basic background information.">
        <NameFields {...props} />
        <Field label="Preferred name" hint="What they like to be called">
          {(p) => <Input {...p} value={values.preferred_name} disabled={disabled} onChange={(e) => set("preferred_name", e.target.value)} />}
        </Field>
        <Field label="Middle name">
          {(p) => <Input {...p} value={values.middle_name} disabled={disabled} onChange={(e) => set("middle_name", e.target.value)} />}
        </Field>
        <Field label="Gender">
          {(p) => (
            <Select {...p} value={values.gender} disabled={disabled} onChange={(e) => set("gender", e.target.value)}>
              <option value="">Not specified</option>
              {GENDERS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Date of birth" error={fieldError(apiError, "date_of_birth")}>
          {(p) => <Input {...p} type="date" value={values.date_of_birth} disabled={disabled} onChange={(e) => set("date_of_birth", e.target.value)} />}
        </Field>
        <Field label="Marital status">
          {(p) => (
            <Select {...p} value={values.marital_status} disabled={disabled} onChange={(e) => set("marital_status", e.target.value)}>
              <option value="">Not specified</option>
              {MARITAL_STATUSES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </FormSection>

      <FormSection title="Contact" description="How the church can reach this person.">
        <ContactFields {...props} />
        <Field label="Home phone">
          {(p) => <Input {...p} type="tel" value={values.phone_home} disabled={disabled} onChange={(e) => set("phone_home", e.target.value)} />}
        </Field>
        <div className="hidden sm:block" />
        <Field label="Street address" className="sm:col-span-2">
          {(p) => (
            <Textarea {...p} rows={2} autoComplete="street-address" value={values.address} disabled={disabled} onChange={(e) => set("address", e.target.value)} />
          )}
        </Field>
        <Field label="City">
          {(p) => <Input {...p} autoComplete="address-level2" value={values.city} disabled={disabled} onChange={(e) => set("city", e.target.value)} />}
        </Field>
        <Field label="State / region">
          {(p) => <Input {...p} autoComplete="address-level1" value={values.state} disabled={disabled} onChange={(e) => set("state", e.target.value)} />}
        </Field>
        <Field label="Postal code">
          {(p) => <Input {...p} autoComplete="postal-code" value={values.postal_code} disabled={disabled} onChange={(e) => set("postal_code", e.target.value)} />}
        </Field>
        <Field label="Country">
          {(p) => <Input {...p} autoComplete="country-name" value={values.country} disabled={disabled} onChange={(e) => set("country", e.target.value)} />}
        </Field>
      </FormSection>

      <FormSection title="Church membership" description="Status, life stage, household and milestones.">
        <MembershipFields {...props} families={families} />
        <Field label="Membership date" error={fieldError(apiError, "membership_date")}>
          {(p) => <Input {...p} type="date" value={values.membership_date} disabled={disabled} onChange={(e) => set("membership_date", e.target.value)} />}
        </Field>
        <Field label="Baptism date" error={fieldError(apiError, "baptism_date")}>
          {(p) => <Input {...p} type="date" value={values.baptism_date} disabled={disabled} onChange={(e) => set("baptism_date", e.target.value)} />}
        </Field>
      </FormSection>

      <FormSection title="Work & notes" description="Optional background information.">
        <Field label="Occupation">
          {(p) => <Input {...p} value={values.occupation} disabled={disabled} onChange={(e) => set("occupation", e.target.value)} />}
        </Field>
        <Field label="Employer">
          {(p) => <Input {...p} value={values.employer} disabled={disabled} onChange={(e) => set("employer", e.target.value)} />}
        </Field>
        <Field label="General notes" hint="Visible to staff. Use pastoral notes on the profile for confidential care notes." className="sm:col-span-2">
          {(p) => <Textarea {...p} rows={3} value={values.notes} disabled={disabled} onChange={(e) => set("notes", e.target.value)} />}
        </Field>
      </FormSection>
    </div>
  );
}
