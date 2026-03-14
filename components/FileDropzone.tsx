import React, { useRef, useState, useCallback } from "react";

interface FileDropzoneProps {
  onFileSelected: (file: File) => void;
  file?: File | null;
  sessionPlan?: string;
  uploadInfo?: string;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({ onFileSelected, file, sessionPlan = "free", uploadInfo }) => {
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) onFileSelected(f);
  }, [onFileSelected]);

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);

  return (
    <div
      className={`dropzone p-12 text-center mb-5 cursor-pointer ${dragging ? "active" : ""}`}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={() => fileRef.current?.click()}
    >
      <input
        ref={fileRef}
        type="file"
        accept=".wav,.aiff,.aif,.mp3,.flac,.ogg,.m4a"
        className="hidden"
        onClick={e => { (e.currentTarget as HTMLInputElement).value = ""; }}
        onChange={e => e.target.files?.[0] && onFileSelected(e.target.files[0])}
      />
      {file ? (
        <div>
          <div className="text-2xl mb-2">🎵</div>
          <div className="font-semibold text-[var(--text-primary)]">{file.name}</div>
          <div className="text-sm text-[var(--text-muted)] mt-1">{(file.size / 1024 / 1024).toFixed(1)} MB</div>
        </div>
      ) : (
        <div>
          <div className="text-4xl mb-3 opacity-50">📂</div>
          <div className="font-semibold text-[var(--text-secondary)]">Przeciągnij plik tutaj lub kliknij</div>
          <div className="text-sm text-[var(--text-muted)] mt-1">{uploadInfo || (sessionPlan === "free" ? "Wersja Lite: max 10 MB, WAV/MP3" : "Wersja Pro: max 100 MB, wszystkie formaty")}</div>
        </div>
      )}
    </div>
  );
};
