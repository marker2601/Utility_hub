import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";

export default function PricingPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight">Pricing</h1>
      <p className="mt-2 text-slate-600">Simple usage-aligned pricing for utility workflows.</p>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Starter</CardTitle>
            <CardDescription>For solo builders validating use cases.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700">
            <p className="text-2xl font-semibold text-slate-900">$0</p>
            <p>1,000 API calls/month</p>
            <p>2 GB storage</p>
            <p>Community support</p>
          </CardContent>
        </Card>

        <Card className="border-sky-300">
          <CardHeader>
            <CardTitle>Pro</CardTitle>
            <CardDescription>For production internal tools and automation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700">
            <p className="text-2xl font-semibold text-slate-900">$49</p>
            <p>100k API calls/month</p>
            <p>100 GB storage</p>
            <p>Priority email support</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Enterprise</CardTitle>
            <CardDescription>Advanced controls and custom capacity.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-700">
            <p className="text-2xl font-semibold text-slate-900">Custom</p>
            <p>SSO + private networking</p>
            <p>Custom SLAs</p>
            <p>Dedicated support</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
