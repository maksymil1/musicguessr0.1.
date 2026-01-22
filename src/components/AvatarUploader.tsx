import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";

interface AvatarUploaderProps {
  url: string | null;
  onUpload: (url: string) => void;
  editable?: boolean;
  size?: number; // Rozmiar w pikselach (np. 100)
}

export default function AvatarUploader({ 
  url, 
  onUpload, 
  editable = true,
  size = 100 
}: AvatarUploaderProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (url) setAvatarUrl(url);
  }, [url]);

  const uploadAvatar = async (event: any) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) return;

      const file = event.target.files[0];
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      
      onUpload(data.publicUrl);
      setAvatarUrl(data.publicUrl);
    } catch (error: any) {
      alert("Błąd: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  // Styl kontenera: SZTYWNE wymiary + przycinanie (overflow: hidden)
  const containerStyle: React.CSSProperties = {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: "50%",       // Robi kółko
    overflow: "hidden",        // <--- TO UCINA WSZYSTKO CO WYSTAJE
    position: "relative",
    border: "4px solid #4ade80", 
    margin: "0 auto 15px auto",
    backgroundColor: "#374151",
    boxShadow: "0 0 15px rgba(74, 222, 128, 0.5)",
    flexShrink: 0,             // Zapobiega zgniataniu w flexboxie
    cursor: editable ? "pointer" : "default"
  };

  return (
    <div className="group" style={containerStyle}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt="Avatar"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover", // <--- TO DOPASOWUJE ZDJĘCIE IDEALNIE DO KÓŁKA
            display: "block"
          }}
        />
      ) : (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: `${size / 2}px` }}>
          👤
        </div>
      )}

      {editable && (
        <>
          {/* Nakładka "ZMIEŃ" po najechaniu */}
          <div 
            style={{
              position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              opacity: 0, transition: "opacity 0.2s"
            }}
            className="group-hover:opacity-100"
          >
            <span style={{ color: "white", fontSize: "0.8rem", fontWeight: "bold" }}>
              {uploading ? "..." : "ZMIEŃ"}
            </span>
          </div>
          {/* Niewidzialny input na całej powierzchni */}
          <input
            type="file"
            accept="image/*"
            onChange={uploadAvatar}
            disabled={uploading}
            style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
          />
        </>
      )}
    </div>
  );
}