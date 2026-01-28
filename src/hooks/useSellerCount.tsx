import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SellerCountData {
  sellerCount: number;
  spotsRemaining: number;
  limit: number;
  isFreeRegistration: boolean;
}

export const useSellerCount = () => {
  const [data, setData] = useState<SellerCountData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSellerCount = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: result, error: fnError } = await supabase.functions.invoke("get-seller-count");

      if (fnError) {
        throw new Error(fnError.message);
      }

      setData(result);
    } catch (err) {
      console.error("Error fetching seller count:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch seller count");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSellerCount();
  }, [fetchSellerCount]);

  return {
    ...data,
    isLoading,
    error,
    refetch: fetchSellerCount,
  };
};
