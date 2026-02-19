import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBusiness } from "@/hooks/useBusiness";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Hook that checks if onboarding is completed for the current business.
 * Onboarding is considered complete when all 5 steps have been saved.
 */
export function useOnboarding() {
  const { businessId, isOwnerOrAdmin } = useBusiness();
  const { user } = useAuth();
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !isOwnerOrAdmin) {
      setNeedsOnboarding(false);
      setLoading(false);
      return;
    }

    const check = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("onboarding_answers")
        .select("step")
        .eq("business_id", businessId);

      if (error) {
        setNeedsOnboarding(false);
        setLoading(false);
        return;
      }

      const completedSteps = (data ?? []).map((d) => d.step);
      // All 5 steps must be complete
      const allDone = [1, 2, 3, 4, 5].every((s) => completedSteps.includes(s));
      setNeedsOnboarding(!allDone);
      setLoading(false);
    };

    check();
  }, [user, businessId, isOwnerOrAdmin]);

  const markComplete = () => setNeedsOnboarding(false);

  return { needsOnboarding, loading, markComplete };
}
