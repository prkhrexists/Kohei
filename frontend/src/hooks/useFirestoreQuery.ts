import { useEffect, useMemo, useState } from "react";
import type { Query, DocumentData } from "firebase/firestore";
import { onSnapshot } from "firebase/firestore";

type FirestoreQueryState<T> = {
  data: T[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

export function useFirestoreQuery<T = DocumentData>(queryRef: Query<T>): FirestoreQueryState<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useMemo(() => () => setRefreshKey((prev) => prev + 1), []);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      queryRef,
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => doc.data());
        setData(docs);
        setLoading(false);
      },
      (err) => {
        setError(err.message ?? "Failed to load data");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [queryRef, refreshKey]);

  return { data, loading, error, refetch };
}
