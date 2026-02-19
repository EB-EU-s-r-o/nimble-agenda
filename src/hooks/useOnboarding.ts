import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness, DEMO_BUSINESS_ID } from "@/hooks/useBusiness";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Hook that checks if onboarding is completed for the current business.
 * Primary check: businesses.onboarding_completed boolean flag.
 * Fallback: onboarding_answers progress state.
 */
export function useOnboarding() {
  const { businessId, isOwnerOrAdmin } = useBusiness();
  const { user } = useAuth();
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !isOwnerOrAdmin || businessId === DEMO_BUSINESS_ID) {
      setNeedsOnboarding(false);
      setLoading(false);
      return;
    }

    const check = async () => {
      setLoading(true);

      // Primary: check the deterministic flag on the business
      const { data: biz, error: bizErr } = await supabase
        .from("businesses")
        .select("onboarding_completed")
        .eq("id", businessId)
        .maybeSingle();

      if (bizErr || !biz) {
        setNeedsOnboarding(false);
        setLoading(false);
        return;
      }

      if (biz.onboarding_completed) {
        setNeedsOnboarding(false);
        setLoading(false);
        return;
      }

      // Not yet completed — show wizard
      setNeedsOnboarding(true);
      setLoading(false);
    };

    check();
  }, [user, businessId, isOwnerOrAdmin]);

  const markComplete = () => setNeedsOnboarding(false);

  return { needsOnboarding, loading, markComplete };
}
