"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const PLANS = [
  { id: "starter", label: "Starter · ₹4,999/mo · 100 docs" },
  { id: "growth", label: "Growth · ₹9,999/mo · 500 docs" },
  { id: "scale", label: "Scale · ₹19,999/mo · unlimited" }
];
const SCOPES = ["documents:generate", "notices:bulk"] as const;

interface Org {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: "active" | "suspended";
  monthly_doc_quota: number;
  created_at: string;
}
interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export function OrgManager() {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [plan, setPlan] = useState("starter");
  const [openId, setOpenId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/orgs");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Load failed.");
      setOrgs(data.organizations ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function createOrg(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/admin/orgs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, plan })
    });
    if (!res.ok) {
      setError((await res.json()).error ?? "Create failed.");
      return;
    }
    setName("");
    await load();
  }

  async function patchOrg(id: string, patch: { plan?: string; status?: string }) {
    const res = await fetch(`/api/admin/orgs/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch)
    });
    if (!res.ok) setError((await res.json()).error ?? "Update failed.");
    await load();
  }

  return (
    <div className="flex flex-col gap-6">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      ) : null}

      <form onSubmit={createOrg} className="flex flex-wrap items-end gap-3 rounded-xl border border-ink-100 bg-white p-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="org-name" className="text-xs font-medium text-ink-700">Organization name</label>
          <input
            id="org-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Acme Realty Pvt Ltd"
            className="w-64 rounded-md border border-ink-200 p-2 text-sm"
            required
            minLength={2}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="org-plan" className="text-xs font-medium text-ink-700">Plan</label>
          <select id="org-plan" value={plan} onChange={(e) => setPlan(e.target.value)} className="rounded-md border border-ink-200 p-2 text-sm">
            {PLANS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
        <Button type="submit">Create organization</Button>
      </form>

      {loading ? (
        <p className="text-sm text-ink-500">Loading…</p>
      ) : orgs.length === 0 ? (
        <p className="text-sm text-ink-500">No organizations yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {orgs.map((org) => (
            <li key={org.id} className="rounded-xl border border-ink-100 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-ink-900">{org.name}</p>
                  <p className="text-xs text-ink-500">
                    {org.slug} · quota {org.monthly_doc_quota === 0 ? "unlimited" : `${org.monthly_doc_quota}/mo`}
                    {" · "}
                    <span className={org.status === "active" ? "text-green-700" : "text-red-700"}>{org.status}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={org.plan}
                    onChange={(e) => patchOrg(org.id, { plan: e.target.value })}
                    className="rounded-md border border-ink-200 p-1.5 text-xs"
                  >
                    {PLANS.map((p) => <option key={p.id} value={p.id}>{p.id}</option>)}
                  </select>
                  <Button
                    variant="outline"
                    onClick={() => patchOrg(org.id, { status: org.status === "active" ? "suspended" : "active" })}
                  >
                    {org.status === "active" ? "Suspend" : "Reactivate"}
                  </Button>
                  <Button variant="outline" onClick={() => setOpenId(openId === org.id ? null : org.id)}>
                    {openId === org.id ? "Hide keys" : "API keys"}
                  </Button>
                </div>
              </div>
              {openId === org.id ? <KeyPanel orgId={org.id} onError={setError} /> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function KeyPanel({ orgId, onError }: { orgId: string; onError: (s: string) => void }) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>(["documents:generate"]);
  const [freshToken, setFreshToken] = useState<string | null>(null);

  const loadKeys = useCallback(async () => {
    const res = await fetch(`/api/admin/orgs/${orgId}/keys`);
    const data = await res.json();
    if (res.ok) setKeys(data.keys ?? []);
  }, [orgId]);
  useEffect(() => {
    void loadKeys();
  }, [loadKeys]);

  async function createKey(e: React.FormEvent) {
    e.preventDefault();
    setFreshToken(null);
    const res = await fetch(`/api/admin/orgs/${orgId}/keys`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, scopes })
    });
    const data = await res.json();
    if (!res.ok) {
      onError(data.error ?? "Key create failed.");
      return;
    }
    setFreshToken(data.token);
    setName("");
    await loadKeys();
  }

  async function revoke(keyId: string) {
    const res = await fetch(`/api/admin/orgs/${orgId}/keys/${keyId}`, { method: "DELETE" });
    if (!res.ok) onError((await res.json()).error ?? "Revoke failed.");
    await loadKeys();
  }

  return (
    <div className="mt-4 rounded-lg border border-ink-100 bg-ink-50/40 p-3">
      {freshToken ? (
        <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs">
          <p className="font-medium text-amber-900">Copy this token now — it is shown only once:</p>
          <code className="mt-1 block break-all rounded bg-white p-1.5 font-mono text-[11px]">{freshToken}</code>
        </div>
      ) : null}

      <form onSubmit={createKey} className="flex flex-wrap items-end gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Key label (e.g. prod server)"
          className="w-52 rounded-md border border-ink-200 p-1.5 text-xs"
          required
          minLength={2}
        />
        {SCOPES.map((s) => (
          <label key={s} className="flex items-center gap-1 text-xs text-ink-700">
            <input
              type="checkbox"
              checked={scopes.includes(s)}
              onChange={(e) =>
                setScopes((prev) => (e.target.checked ? [...prev, s] : prev.filter((x) => x !== s)))
              }
            />
            {s}
          </label>
        ))}
        <Button type="submit" disabled={scopes.length === 0}>Mint key</Button>
      </form>

      <ul className="mt-3 flex flex-col gap-1.5">
        {keys.length === 0 ? <li className="text-xs text-ink-500">No keys.</li> : null}
        {keys.map((k) => (
          <li key={k.id} className="flex items-center justify-between gap-2 text-xs">
            <span className={k.revoked_at ? "text-ink-400 line-through" : "text-ink-800"}>
              <code className="font-mono">{k.key_prefix}…</code> · {k.name} · [{k.scopes.join(", ")}]
              {k.last_used_at ? ` · used ${new Date(k.last_used_at).toLocaleDateString()}` : " · never used"}
            </span>
            {k.revoked_at ? (
              <span className="text-ink-400">revoked</span>
            ) : (
              <button onClick={() => revoke(k.id)} className="text-red-600 hover:underline">Revoke</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
