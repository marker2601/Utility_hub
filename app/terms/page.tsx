export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight">Terms of Service</h1>
      <div className="mt-6 space-y-4 text-sm leading-7 text-slate-700">
        <p>By using Utility Hub, you agree to use the service lawfully and not abuse shared infrastructure.</p>
        <p>You are responsible for the content you upload and any API keys created under your account.</p>
        <p>Service availability targets are best-effort for MVP and may change with commercial plans.</p>
      </div>
    </div>
  );
}
