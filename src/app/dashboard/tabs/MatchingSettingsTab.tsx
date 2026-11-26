"use client";

import * as React from "react";
import { apiFetch } from "@/lib/api";

type MatchingSettings = {
  merchantInitialRadiusKm: number;
  merchantMaxRadiusKm: number;
  riderInitialRadiusKm: number;
  riderMaxRadiusKm: number;
};
type SettingKey = keyof MatchingSettings;
type Fields = Record<SettingKey, string>;

const keys: SettingKey[] = [
  "merchantInitialRadiusKm",
  "merchantMaxRadiusKm",
  "riderInitialRadiusKm",
  "riderMaxRadiusKm",
];

function asFields(settings: MatchingSettings): Fields {
  return Object.fromEntries(keys.map((key) => [key, String(settings[key])])) as Fields;
}

function validationMessage(fields: Fields) {
  const values = Object.fromEntries(keys.map((key) => [key, Number(fields[key])])) as MatchingSettings;
  if (keys.some((key) => !fields[key].trim() || !Number.isFinite(values[key]) || values[key] < 0.1 || values[key] > 1000))
    return "Enter a radius between 0.1 and 1000 km for each field.";
  if (values.merchantMaxRadiusKm < values.merchantInitialRadiusKm)
    return "Merchant maximum must be at least the initial radius.";
  if (values.riderMaxRadiusKm < values.riderInitialRadiusKm)
    return "Rider maximum must be at least the initial radius.";
  return null;
}

export default function MatchingSettingsTab() {
  const [fields, setFields] = React.useState<Fields | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let active = true;
    apiFetch<MatchingSettings>("/admin/config/matching")
      .then((settings) => { if (active) setFields(asFields(settings)); })
      .catch((cause) => { if (active) setError(cause?.message || "Could not load matching settings."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const update = (key: SettingKey, value: string) => {
    setFields((current) => current ? { ...current, [key]: value } : current);
    setMessage("");
    setError("");
  };

  const save = async () => {
    if (!fields) return;
    const invalid = validationMessage(fields);
    if (invalid) { setError(invalid); return; }
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const settings = await apiFetch<MatchingSettings>("/admin/config/matching", {
        method: "PUT",
        body: JSON.stringify(Object.fromEntries(keys.map((key) => [key, Number(fields[key])]))),
      });
      setFields(asFields(settings));
      setMessage("Matching settings saved.");
    } catch (cause: any) {
      setError(cause?.message || "Could not save matching settings.");
    } finally {
      setSaving(false);
    }
  };

  const input = (key: SettingKey, label: string) => (
    <label className="block text-xs font-medium text-gray-600" key={key}>
      {label}
      <div className="relative mt-1">
        <input
          type="number"
          min="0.1"
          max="1000"
          step="0.1"
          value={fields?.[key] ?? ""}
          onChange={(event) => update(key, event.target.value)}
          disabled={!fields || saving}
          className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 pr-10 text-sm text-gray-900 outline-none focus:border-[#0B1E5B] disabled:opacity-60"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">km</span>
      </div>
    </label>
  );

  return <div className="mt-6 max-w-[760px]">
    <h3 className="text-lg font-semibold text-gray-900">Matching reach</h3>
    <p className="mt-1 text-sm leading-6 text-gray-600">Start nearby. If no eligible merchant or rider is found, the search radius doubles until it finds one or reaches the maximum.</p>
    {loading ? <p className="mt-6 text-sm text-gray-500">Loading matching settings…</p> : null}
    {fields ? <>
      <div className="mt-6 border-b border-gray-200 pb-6">
        <h4 className="text-sm font-semibold text-[#0B1E5B]">Merchants</h4>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {input("merchantInitialRadiusKm", "Initial search radius")}
          {input("merchantMaxRadiusKm", "Maximum search radius")}
        </div>
      </div>
      <div className="pt-6">
        <h4 className="text-sm font-semibold text-[#0B1E5B]">Riders</h4>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {input("riderInitialRadiusKm", "Initial search radius")}
          {input("riderMaxRadiusKm", "Maximum search radius")}
        </div>
      </div>
      <p className="mt-5 text-xs leading-5 text-gray-500">Only verified, online providers who can take the job are considered. A maximum radius does not guarantee a match.</p>
      <button type="button" onClick={() => void save()} disabled={saving} className="mt-6 h-11 rounded-md bg-[#0B1E5B] px-6 text-sm font-semibold text-white disabled:opacity-60">{saving ? "Saving…" : "Save matching settings"}</button>
    </> : null}
    {error ? <p role="alert" className="mt-4 text-sm text-red-700">{error}</p> : null}
    {message ? <p role="status" className="mt-4 text-sm text-[#0B1E5B]">{message}</p> : null}
  </div>;
}
