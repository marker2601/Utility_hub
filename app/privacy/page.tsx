export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
      <div className="mt-6 space-y-4 text-sm leading-7 text-slate-700">
        <p>Utility Hub stores account, file metadata, and job metadata to deliver service functionality.</p>
        <p>Uploaded files are stored in private object storage. Access is mediated by authenticated API endpoints.</p>
        <p>We log security-relevant events such as uploads, downloads, key usage, and job lifecycle events.</p>
        <p>Contact support to request account data export or deletion.</p>
      </div>
    </div>
  );
}
