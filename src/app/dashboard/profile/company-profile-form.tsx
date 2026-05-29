"use client";

import { useState, useRef } from "react";
import { updateCompanyProfile } from "./actions";

type Profile = {
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  defaultMailType: string | null;
};

export function CompanyProfileForm({ profile }: { profile: Profile }) {
  const [saved, setSaved] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(profile.logoUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(formData: FormData) {
    await updateCompanyProfile(null, formData);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("logo", file);
      const res = await fetch("/api/upload-logo", { method: "POST", body: fd });
      const data = await res.json();
      if (data.ok) {
        setLogoPreview(data.logoUrl);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        alert(data.error || "Upload failed");
      }
    } finally {
      setUploading(false);
    }
  }

  const primaryColor = profile.primaryColor ?? "#2563eb";
  const accentColor = profile.accentColor ?? "#0ea5e9";

  return (
    <form action={handleSubmit} className="grid gap-6">
      {/* Company Name */}
      <div className="public-surface p-6">
        <div className="mb-5">
          <div className="lux-label">Brand identity</div>
          <h2 className="mt-2 text-lg font-semibold text-white">Company name</h2>
        </div>
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-400">
            Display name
          </label>
          <input
            type="text"
            name="companyName"
            defaultValue={profile.name}
            className="w-full rounded-xl border border-white/10 bg-[#091426] px-4 py-3 text-white placeholder-slate-600 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
          />
        </div>
      </div>

      {/* Logo */}
      <div className="public-surface p-6">
        <div className="mb-5">
          <div className="lux-label">White label</div>
          <h2 className="mt-2 text-lg font-semibold text-white">Company logo</h2>
        </div>

        {/* Current logo preview */}
        {logoPreview && (
          <div className="mb-4 flex items-center gap-4 rounded-xl border border-white/10 bg-[#091426] p-4">
            <img
              src={logoPreview}
              alt="Current logo"
              className="h-12 max-w-[160px] object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <span className="text-xs text-slate-500">Current logo</span>
          </div>
        )}

        {/* File upload */}
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-400">
            Upload logo
          </label>
          <input
            ref={fileInputRef}
            type="file"
            name="logo"
            accept="image/jpeg,image/png,image/svg+xml,image/webp"
            onChange={handleLogoUpload}
            className="w-full rounded-xl border border-white/10 bg-[#091426] px-4 py-3 text-sm text-slate-300 file:mr-3 file:rounded-full file:border-0 file:bg-sky-500 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
          />
          <p className="mt-2 text-xs text-slate-500">
            JPEG, PNG, SVG, or WebP · Max 2MB · Recommended: 200×60px
          </p>
        </div>
      </div>

      {/* Colors */}
      <div className="public-surface p-6">
        <div className="mb-5">
          <div className="lux-label">White label</div>
          <h2 className="mt-2 text-lg font-semibold text-white">Brand colors</h2>
          <p className="mt-1 text-xs text-slate-500">
            These colors appear in the client portal header and accents.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-400">
              Primary color
            </label>
            <div className="flex items-center gap-3">
              <ColorPicker
                name="primaryColorText"
                defaultValue={primaryColor}
              />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-slate-400">
              Accent color
            </label>
            <div className="flex items-center gap-3">
              <ColorPicker
                name="accentColorText"
                defaultValue={accentColor}
              />
            </div>
          </div>
        </div>

        {/* Live preview */}
        <div className="mt-5 rounded-xl border border-white/10 bg-[#091426] p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">Preview</p>
          <div
            className="flex h-12 items-center gap-3 rounded-lg px-4"
            style={{ backgroundColor: primaryColor }}
          >
            <div
              className="h-8 w-8 rounded-lg"
              style={{ backgroundColor: accentColor }}
            />
            <span className="font-semibold text-white">{profile.name}</span>
          </div>
        </div>
      </div>

      {/* Mailing Default */}
      <div className="public-surface p-6">
        <div className="mb-5">
          <div className="lux-label">Mailing</div>
          <h2 className="mt-2 text-lg font-semibold text-white">Default mail type</h2>
          <p className="mt-1 text-xs text-slate-500">
            Pre-selected when generating dispute letters. Can be overridden per-send. Certified mail incurs an additional charge.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-[#091426] p-4 hover:border-white/20 has-[:checked]:border-sky-500/50 has-[:checked]:bg-sky-500/10">
            <input
              type="radio"
              name="defaultMailType"
              value="REGULAR"
              defaultChecked={profile.defaultMailType === "REGULAR" || !profile.defaultMailType}
              className="mt-1 accent-sky-500"
            />
            <div>
              <div className="font-semibold text-white">Regular mail</div>
              <div className="mt-1 text-xs text-slate-400">Standard postal delivery. No additional charge.</div>
            </div>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-[#091426] p-4 hover:border-white/20 has-[:checked]:border-sky-500/50 has-[:checked]:bg-sky-500/10">
            <input
              type="radio"
              name="defaultMailType"
              value="CERTIFIED"
              defaultChecked={profile.defaultMailType === "CERTIFIED"}
              className="mt-1 accent-sky-500"
            />
            <div>
              <div className="font-semibold text-white">Certified mail</div>
              <div className="mt-1 text-xs text-slate-400">With tracking and delivery confirmation. Charged per letter.</div>
            </div>
          </label>
        </div>
      </div>

      {/* Submit */}
      <div className="flex items-center justify-end gap-4">
        {saved && (
          <span className="text-sm text-emerald-400">Changes saved</span>
        )}
        <button
          type="submit"
          className="lux-button-primary px-8 py-3 text-base"
        >
          Save changes
        </button>
      </div>
    </form>
  );
}

function ColorPicker({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue: string;
}) {
  const [textValue, setTextValue] = useState(defaultValue);

  return (
    <>
      <input
        type="color"
        value={textValue}
        className="h-12 w-12 cursor-pointer rounded-xl border border-white/10 bg-transparent p-1"
        onInput={(e) => setTextValue((e.target as HTMLInputElement).value)}
      />
      <input
        type="text"
        name={name}
        value={textValue}
        onChange={(e) => setTextValue(e.target.value)}
        placeholder="#2563eb"
        className="flex-1 rounded-xl border border-white/10 bg-[#091426] px-4 py-3 text-white placeholder-slate-600 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400"
      />
    </>
  );
}
