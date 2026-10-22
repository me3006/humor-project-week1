"use client";
/* eslint-disable @next/next/no-img-element -- Profile images include local blob previews. */

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function ProfileForm({
  userId,
  initialFirstName,
  initialLastName,
  initialAvatarUrl = "",
}: {
  userId: string;
  initialFirstName: string;
  initialLastName: string;
  initialAvatarUrl?: string;
}) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState("");

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    };
  }, [avatarPreviewUrl]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setMessage("");
    const supabase = createClient();

    let avatarUrl: string | null = null;

    if (avatarFile) {
      if (
        !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(
          avatarFile.type,
        ) ||
        avatarFile.size > 5 * 1024 * 1024
      ) {
        setMessage("Choose a PNG, JPEG, WebP, or GIF up to 5 MB.");
        setSaving(false);
        return;
      }
      const fileExt = avatarFile.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, avatarFile);

      if (uploadError) {
        setMessage(`Error uploading image: ${uploadError.message}`);
        setSaving(false);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      avatarUrl = publicUrl;
    }

    const updates: {
      first_name: string;
      last_name: string;
      avatar_url?: string;
    } = {
      first_name: firstName,
      last_name: lastName,
    };

    if (avatarUrl) {
      updates.avatar_url = avatarUrl;
    }

    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId)
      .select("id")
      .single();

    if (error) {
      setMessage(`Error saving profile: ${error.message}`);
      setSaving(false);
      return;
    }

    window.location.reload();
  };

  return (
    <>
      {(avatarPreviewUrl || initialAvatarUrl) && (
        <img
          className="avatar"
          src={avatarPreviewUrl || initialAvatarUrl}
          alt={
            avatarPreviewUrl
              ? "Selected profile picture preview"
              : "Your profile"
          }
          width={100}
          height={100}
        />
      )}
      <fieldset disabled={saving} style={{ border: 0, padding: 0 }}>
        <h3 style={{ marginBottom: "14px" }}>Edit profile</h3>

        <div
          style={{
            display: "flex",
            gap: "16px",
            marginBottom: "16px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <label
              htmlFor="first-name"
              style={{
                display: "block",
                marginBottom: "4px",
              }}
            >
              First name
            </label>

            <input
              id="first-name"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>

          <div>
            <label
              htmlFor="last-name"
              style={{
                display: "block",
                marginBottom: "4px",
              }}
            >
              Last name
            </label>

            <input
              id="last-name"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            style={{ display: "none" }}
            aria-label="Choose a new profile picture"
            onChange={(e) => {
              const file = e.target.files?.[0] ?? null;
              setAvatarFile(file);
              setAvatarPreviewUrl(file ? URL.createObjectURL(file) : "");
            }}
          />

          <button type="button" onClick={() => fileInputRef.current?.click()}>
            Upload new profile picture
          </button>
        </div>

        <button onClick={handleSave}>
          {saving ? "Saving…" : "Save profile"}
        </button>
        {message && (
          <p role="alert" className="error">
            {message}
          </p>
        )}
      </fieldset>
    </>
  );
}
