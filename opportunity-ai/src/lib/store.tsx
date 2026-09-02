"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { DEFAULT_PROFILE } from "./data";
import type { Activity, ActivityAction, StudentProfile } from "./types";

const STORAGE_KEY = "opportunity-ai:state";

interface StoredState {
  profile: StudentProfile;
  activities: Activity[];
  onboarded: boolean;
}

interface StoreValue extends StoredState {
  hydrated: boolean;
  setProfile: (profile: StudentProfile) => void;
  completeOnboarding: (profile: StudentProfile) => void;
  track: (opportunityId: string, action: ActivityAction) => void;
  isSaved: (opportunityId: string) => boolean;
  isRegistered: (opportunityId: string) => boolean;
  isDismissed: (opportunityId: string) => boolean;
  reset: () => void;
}

const initialState: StoredState = {
  profile: DEFAULT_PROFILE,
  activities: [],
  onboarded: false,
};

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<StoredState>(initialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setState({ ...initialState, ...JSON.parse(raw) });
    } catch {
      // ignore corrupted storage and fall back to defaults
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const setProfile = useCallback((profile: StudentProfile) => {
    setState((prev) => ({ ...prev, profile }));
  }, []);

  const completeOnboarding = useCallback((profile: StudentProfile) => {
    setState((prev) => ({ ...prev, profile, onboarded: true }));
  }, []);

  const track = useCallback(
    (opportunityId: string, action: ActivityAction) => {
      setState((prev) => {
        const isToggle = action === "SAVE" || action === "DISMISS";
        const existing = prev.activities.find(
          (a) => a.opportunityId === opportunityId && a.action === action,
        );
        if (isToggle && existing) {
          return {
            ...prev,
            activities: prev.activities.filter((a) => a.id !== existing.id),
          };
        }
        const activity: Activity = {
          id: `${opportunityId}-${action}-${Date.now()}`,
          opportunityId,
          action,
          timestamp: Date.now(),
        };
        return { ...prev, activities: [activity, ...prev.activities].slice(0, 200) };
      });
    },
    [],
  );

  const has = useCallback(
    (opportunityId: string, action: ActivityAction) =>
      state.activities.some(
        (a) => a.opportunityId === opportunityId && a.action === action,
      ),
    [state.activities],
  );

  const value = useMemo<StoreValue>(
    () => ({
      ...state,
      hydrated,
      setProfile,
      completeOnboarding,
      track,
      isSaved: (id) => has(id, "SAVE"),
      isRegistered: (id) => has(id, "REGISTER"),
      isDismissed: (id) => has(id, "DISMISS"),
      reset: () => setState(initialState),
    }),
    [state, hydrated, setProfile, completeOnboarding, track, has],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used inside <StoreProvider>");
  return context;
}
