"use client";

import Modal from "@/components/ui/Modal";
import { useAdminErrorLogDetail } from "@/hooks/api/useErrorLogs";

interface Props {
  errorId: string | null;
  onClose: () => void;
}

function SeverityBadge({ severity }: { severity: string }) {
  const styles: Record<string, string> = {
    error: "bg-red-100 text-red-700",
    warning: "bg-yellow-100 text-yellow-700",
    info: "bg-blue-100 text-blue-700",
    critical: "bg-red-200 text-red-900",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${styles[severity] || "bg-muted text-muted-foreground"}`}>
      {severity}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open: "bg-red-100 text-red-700",
    resolved: "bg-green-100 text-green-700",
    ignored: "bg-muted text-muted-foreground",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${styles[status] || "bg-muted text-muted-foreground"}`}>
      {status}
    </span>
  );
}

export default function ErrorLogDetailModal({ errorId, onClose }: Props) {
  const { data, isLoading } = useAdminErrorLogDetail(errorId);
  const error = data?.data;

  return (
    <Modal
      isOpen={!!errorId}
      onClose={onClose}
      title="Error Details"
    >
      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground">Loading...</div>
      ) : error ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <SeverityBadge severity={error.severity} />
            <StatusBadge status={error.status} />
            <span className="text-xs text-muted-foreground ml-auto">
              {new Date(error.occurredAt).toLocaleString()}
            </span>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Code</label>
            <p className="text-sm font-mono text-foreground mt-0.5">{error.code}</p>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Message</label>
            <p className="text-sm text-foreground mt-0.5">{error.message}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Product</label>
              <p className="text-sm text-foreground mt-0.5">{error.product}</p>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Organization</label>
              <p className="text-sm text-foreground mt-0.5">{error.organizationName || "N/A"}</p>
            </div>
          </div>

          {error.stackTrace && (
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Stack Trace</label>
              <pre className="mt-1 text-xs font-mono bg-muted rounded-lg p-3 overflow-x-auto max-h-48 text-foreground/80">
                {error.stackTrace}
              </pre>
            </div>
          )}

          {error.metadata && Object.keys(error.metadata).length > 0 && (
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Metadata</label>
              <pre className="mt-1 text-xs font-mono bg-muted rounded-lg p-3 overflow-x-auto max-h-32 text-foreground/80">
                {JSON.stringify(error.metadata, null, 2)}
              </pre>
            </div>
          )}

          {error.resolvedAt && (
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Resolved {new Date(error.resolvedAt).toLocaleString()}
                {error.resolvedBy && ` by ${error.resolvedBy}`}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="py-8 text-center text-muted-foreground">Error not found</div>
      )}
    </Modal>
  );
}
