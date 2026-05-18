"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import { getToken, removeToken, removeRole } from "@/lib/auth";
import type { AuthUser } from "@/types/auth";

export function useUser() {
  const router = useRouter();
  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID ?? "grid";

  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    api
      .get(`/api/${tenantId}/user`)
      .then((res) => setUser(res.data))
      .catch(() => {
        removeToken();
        router.replace("/login");
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function logout() {
    api
      .post(`/api/${tenantId}/logout`)
      .catch(() => {})
      .finally(() => {
        removeToken();
        removeRole();
        router.replace("/login");
      });
  }

  return { user, loading, logout };
}
