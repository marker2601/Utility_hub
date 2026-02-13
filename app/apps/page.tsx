import appsSeed from "@/docs/apps-seed.json";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";

interface SeedItem {
  id: string;
  name: string;
  description: string;
  inputs: Array<{ name: string; type: string; required: boolean }>;
  options: Array<{ name: string; type: string; default?: unknown }>;
}

const apps = appsSeed as SeedItem[];

export default function AppsDirectoryPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Apps Directory</h1>
        <p className="mt-2 text-slate-600">Registry-backed utility apps available in this workspace.</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {apps.map((app) => (
          <Card key={app.id} className="h-full">
            <CardHeader>
              <CardTitle>{app.name}</CardTitle>
              <CardDescription>{app.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-700">
              <div>
                <p className="font-medium text-slate-900">Inputs</p>
                <ul className="mt-1 space-y-1">
                  {app.inputs.map((input) => (
                    <li key={input.name}>
                      {input.name} ({input.type}) {input.required ? "required" : "optional"}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-medium text-slate-900">Options</p>
                <ul className="mt-1 space-y-1">
                  {app.options.map((option) => (
                    <li key={option.name}>
                      {option.name} ({option.type}) default={String(option.default ?? "n/a")}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
