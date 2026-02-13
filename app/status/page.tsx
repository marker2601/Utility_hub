import { Badge } from "@/app/components/ui/badge";

export default function StatusPage() {
  const now = new Date().toISOString();

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight">System Status</h1>
      <p className="mt-2 text-slate-600">Current service health for Utility Hub MVP.</p>

      <div className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <p className="font-medium text-slate-900">Web + API</p>
          <Badge variant="success">Operational</Badge>
        </div>
        <div className="flex items-center justify-between">
          <p className="font-medium text-slate-900">Worker Runner</p>
          <Badge variant="success">Operational</Badge>
        </div>
        <div className="flex items-center justify-between">
          <p className="font-medium text-slate-900">Storage (R2)</p>
          <Badge variant="success">Operational</Badge>
        </div>
        <p className="text-xs text-slate-500">Last updated: {now}</p>
      </div>
    </div>
  );
}
