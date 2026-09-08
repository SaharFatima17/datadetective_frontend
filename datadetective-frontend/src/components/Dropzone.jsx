import { useRef, useState } from "react";
import { FileSpreadsheet, Loader2, Upload } from "lucide-react";

const TABULAR = [".csv", ".tsv", ".xlsx", ".xls", ".json", ".parquet"];
const DOCUMENTS = [".pdf", ".docx", ".pptx", ".txt", ".html", ".md"];

export default function Dropzone({ onFile, busy, accept = "both", compact = false }) {
  const [over, setOver] = useState(false);
  const [rejected, setRejected] = useState(null);
  const inputRef = useRef(null);

  const allowed =
    accept === "tabular" ? TABULAR : accept === "documents" ? DOCUMENTS : [...TABULAR, ...DOCUMENTS];

  function handle(file) {
    if (!file) return;
    const ext = "." + file.name.split(".").pop().toLowerCase();
    if (!allowed.includes(ext)) {
      setRejected(
        `${file.name} isn't a supported type. Use ${allowed.join(", ")}.`,
      );
      return;
    }
    setRejected(null);
    onFile(file);
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          handle(e.dataTransfer.files?.[0]);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-[14px]
          border-2 border-dashed text-center transition-colors duration-150
          ${compact ? "px-5 py-7" : "px-6 py-12"}`}
        style={{
          borderColor: over ? "var(--accent)" : "var(--border-strong)",
          background: over ? "var(--accent-quiet)" : "var(--surface-inset)",
        }}
      >
        {busy ? (
          <>
            <Loader2 size={22} className="animate-spin text-[var(--accent)]" />
            <p className="mt-3 text-[13.5px] font-medium">Reading the file</p>
            <p className="mt-1 text-[12.5px] text-[var(--text-muted)]">
              Registering provenance and profiling the columns
            </p>
          </>
        ) : (
          <>
            {over ? (
              <FileSpreadsheet size={22} className="text-[var(--accent)]" />
            ) : (
              <Upload size={22} className="text-[var(--text-muted)]" />
            )}
            <p className="mt-3 text-[13.5px] font-medium">
              {over ? "Release to upload" : "Drop a file here, or click to choose"}
            </p>
            <p className="mt-1 max-w-sm text-[12.5px] leading-relaxed text-[var(--text-muted)]">
              Spreadsheets become datasets you can investigate. Documents are indexed
              as background context the agents can retrieve.
            </p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          accept={allowed.join(",")}
          onChange={(e) => {
            handle(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      {rejected && (
        <p className="mt-2 text-[12.5px] text-[var(--color-alert-soft)]">{rejected}</p>
      )}
    </div>
  );
}
