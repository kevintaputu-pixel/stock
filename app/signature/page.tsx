import { Suspense } from "react";
import SignatureClient from "./SignatureClient";

export const dynamic = "force-dynamic";

export default function SignaturePage() {
  return (
    <Suspense fallback={<div style={{ padding: 20 }}>Chargement...</div>}>
      <SignatureClient />
    </Suspense>
  );
}