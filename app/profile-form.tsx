"use client";

import { useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function ProfileForm({
  userId,
  initialFirstName,
  initialLastName,
}: {
  userId: string;
  initialFirstName: string;
  initialLastName: string;
}) {
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    const supabase = createClient();

    let avatarUrl: string | null = null;

    if (avatarFile) {
      const fileExt = avatarFile.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, avatarFile);

      if (uploadError) {
        alert(`Error uploading image: ${uploadError.message}`);
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
      .eq("id", userId);

    if (error) {
      alert(`Error saving profile: ${error.message}`);
      return;
    }

    window.location.reload();
  };

  return (
    <div>
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
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
        >
          Upload new profile picture
        </button>

        <p style={{ marginTop: "6px", marginBottom: "0" }}>
          {avatarFile ? avatarFile.name : "No new image selected"}
        </p>
      </div>

      <button onClick={handleSave}>Save profile</button>
    </div>
  );
}