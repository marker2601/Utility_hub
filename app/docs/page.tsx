import Script from "next/script";

export default function DocsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-4">
        <h1 className="text-3xl font-semibold tracking-tight">API Docs</h1>
        <p className="mt-2 text-slate-600">OpenAPI 3.0 reference for Utility Hub endpoints.</p>
      </div>

      <div id="redoc-container" className="overflow-hidden rounded-xl border border-slate-200 bg-white p-2" />

      <Script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js" strategy="afterInteractive" />
      <Script id="redoc-init" strategy="afterInteractive">
        {`(() => {
          const mount = document.getElementById('redoc-container');
          if (!mount || !(window).Redoc) return;
          (window).Redoc.init('/docs/openapi.json', {
            hideDownloadButton: false,
            hideHostname: true,
            expandResponses: '200,201'
          }, mount);
        })();`}
      </Script>
    </div>
  );
}
