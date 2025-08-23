// src/app/client-provider.tsx
'use client';

import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "@/components/ui/sonner";

export function ClientProvider({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <Toaster />
    </AuthProvider>
  );
}
