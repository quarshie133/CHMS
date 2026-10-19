"use client";

import { useEffect, useState, type SyntheticEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  errorMessage,
  familiesApi,
  groupsApi,
  listAll,
  membersApi,
  type Family,
  type Group,
  type MemberDetail,
} from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { Field, Input } from "@/components/ui/form";
import { Alert, Button, ButtonLink, Card, Icon, PageHeader } from "@/components/ui/primitives";
import {
  emptyMember,
  formToPayload,
  MemberFullForm,
  validateMember,
  type MemberFormErrors,
  type MemberFormValues,
} from "@/components/member-form";
import { todayISO } from "@/lib/format";

export default function AddPersonPage() {
  const router = useRouter();
  const { token } = useAuth();
  const toast = useToast();

  const [values, setValues] = useState<MemberFormValues>({ ...emptyMember, membership_date: todayISO() });
  const [errors, setErrors] = useState<MemberFormErrors>({});
  const [apiError, setApiError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);

  const [families, setFamilies] = useState<Family[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [newFamilyName, setNewFamilyName] = useState("");
  const [creatingFamily, setCreatingFamily] = useState(false);

  useEffect(() => {
    if (!token) return;
    listAll(familiesApi.list, token, "ordering=name").then(setFamilies).catch(() => setFamilies([]));
    listAll(groupsApi.list, token, "is_active=true").then(setGroups).catch(() => setGroups([]));
  }, [token]);

  const set = <K extends keyof MemberFormValues>(key: K, value: MemberFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    if (key in errors) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const createFamily = async () => {
    const name = newFamilyName.trim();
    if (!token || !name || creatingFamily) return;
    setCreatingFamily(true);
    try {
      const fam = await familiesApi.create(token, { name, city: values.city, state: values.state, postal_code: values.postal_code });
      setFamilies((prev) => [...prev, fam].sort((a, b) => a.name.localeCompare(b.name)));
      set("family_id", fam.id);
      setNewFamilyName("");
      toast.success("Household created", `${fam.name} is now selected for this person.`);
    } catch (err) {
      toast.error("Couldn't create household", errorMessage(err));
    } finally {
      setCreatingFamily(false);
    }
  };

  const toggleGroup = (id: string) =>
    setSelectedGroups((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));

  const handleSubmit = async (e: SyntheticEvent) => {
    e.preventDefault();
    if (!token || saving) return;
    const v = validateMember(values);
    setErrors(v);
    if (Object.keys(v).length) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setSaving(true);
    setApiError(null);
    try {
      const created = (await membersApi.create(token, formToPayload(values))) as unknown as MemberDetail;
      const name = `${values.first_name.trim()} ${values.last_name.trim()}`;

      // Add group memberships; report any that fail without losing the new profile.
      const results = await Promise.allSettled(selectedGroups.map((g) => groupsApi.addMember(token, g, created.id)));
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed) {
        toast.warning("Profile created with warnings", `${name} was saved, but ${failed} group assignment${failed > 1 ? "s" : ""} could not be added.`);
      } else {
        toast.success("Profile created", `${name} was added to the directory.`);
      }
      router.push(`/dashboard/members/${created.id}`);
    } catch (err) {
      setApiError(err);
      setSaving(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Add person"
        description="Register a new member, regular attendee or visitor. Only first and last name are required."
      />

      {apiError ? <Alert title="The profile wasn't saved">{errorMessage(apiError)} Your entries are still here — fix the issue and try again.</Alert> : null}
      {Object.values(errors).some(Boolean) && <Alert title="Check the highlighted fields">Some required information is missing or invalid.</Alert>}

      <form id="add-person-form" onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-6 xl:grid-cols-12 xl:items-start">
        <Card className="p-5 sm:p-6 xl:col-span-8">
          <MemberFullForm values={values} set={set} errors={errors} apiError={apiError} disabled={saving} families={families} />
        </Card>

        <div className="flex flex-col gap-6 xl:col-span-4">
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-ink">New household</h2>
            <p className="mt-0.5 text-[13px] text-ink-muted">Not in the list? Create a household and link this person to it.</p>
            <div className="mt-4 flex items-end gap-2">
              <Field label="Household name" className="flex-1">
                {(p) => (
                  <Input
                    {...p}
                    placeholder="e.g. Mensah Family"
                    value={newFamilyName}
                    disabled={saving || creatingFamily}
                    onChange={(e) => setNewFamilyName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        createFamily();
                      }
                    }}
                  />
                )}
              </Field>
              <Button onClick={createFamily} loading={creatingFamily} disabled={!newFamilyName.trim() || saving}>
                Create
              </Button>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold text-ink">Groups & ministries</h2>
            <p className="mt-0.5 text-[13px] text-ink-muted">Optionally add this person to active groups.</p>
            {groups.length === 0 ? (
              <p className="mt-4 rounded-lg border border-dashed border-line px-3 py-4 text-center text-[13px] text-ink-muted">
                No active groups yet.
              </p>
            ) : (
              <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Groups">
                {groups.map((g) => {
                  const on = selectedGroups.includes(g.id);
                  return (
                    <button
                      key={g.id}
                      type="button"
                      aria-pressed={on}
                      disabled={saving}
                      onClick={() => toggleGroup(g.id)}
                      className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors ${
                        on ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink"
                      }`}
                    >
                      <Icon name={on ? "check" : "add"} size={16} />
                      {g.name}
                    </button>
                  );
                })}
              </div>
            )}
          </Card>
        </div>
      </form>

      {/* Sticky action bar */}
      <div className="sticky bottom-0 z-20 -mx-4 -mb-6 border-t border-line bg-surface/95 backdrop-blur sm:-mx-6 lg:-mx-8 lg:-mb-8">
        <div className="flex items-center justify-end gap-2 px-4 py-3 sm:px-6 lg:px-8">
          <ButtonLink href="/dashboard/members">Cancel</ButtonLink>
          <Button type="submit" form="add-person-form" variant="primary" icon="person_add" loading={saving}>
            {saving ? "Saving…" : "Save person"}
          </Button>
        </div>
      </div>
    </div>
  );
}
