import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";

export type Status = "idle" | "loading" | "error" | "success";

export default function StatusBadge({ status, label }: { status: Status; label?: string }) {
  if (status === "idle") return null;
  const map = {
    loading: { icon: Loader2, cls: "text-teal-deep animate-spin", text: label ?? "Working…" },
    error: { icon: AlertTriangle, cls: "text-rust", text: label ?? "Something went wrong" },
    success: { icon: CheckCircle2, cls: "text-teal-deep", text: label ?? "Done" },
  } as const;
  const { icon: Icon, cls, text } = map[status];
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-xs text-inkSoft">
      <Icon size={14} className={cls} strokeWidth={2} />
      {text}
    </span>
  );
}
