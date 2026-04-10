import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export function useAccessRealtime(
  requestId: string | null,
  page: string,
  onApproved?: () => void,
  onRefused?: () => void
) {
  useEffect(() => {
    if (!requestId) return;

    const channel = supabase
      .channel("access-request-status")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "access_requests",
          filter: `id=eq.${requestId}`,
        },
        (payload) => {
          const status = payload.new.status;

          if (status === "approved") {
            localStorage.setItem(`access:${page}`, "true");
           if (onApproved) {
  onApproved();
}
          }

          if (status === "refused") {
            onRefused && onRefused();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [requestId, page]);
}