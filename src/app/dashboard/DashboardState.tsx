"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

export type AccountDirectory = "users" | "merchants" | "riders";

type DashboardState = {
  permissions: string[];
  directories: Map<AccountDirectory, unknown>;
  scrollPositions: Map<AccountDirectory, number>;
};

const DashboardContext = createContext<DashboardState | null>(null);

export function DashboardStateProvider({ permissions, children }: { permissions: string[]; children: ReactNode }) {
  const directories = useRef(new Map<AccountDirectory, unknown>());
  const scrollPositions = useRef(new Map<AccountDirectory, number>());
  return (
    <DashboardContext.Provider value={{ permissions, directories: directories.current, scrollPositions: scrollPositions.current }}>
      {children}
    </DashboardContext.Provider>
  );
}

function useDashboardState() {
  const state = useContext(DashboardContext);
  if (!state) throw new Error("Dashboard state is unavailable outside the dashboard layout");
  return state;
}

export function useDashboardPermissions() {
  return useDashboardState().permissions;
}

export function useDirectoryState<T extends { page: number }>(directory: AccountDirectory, initial: T) {
  const { directories } = useDashboardState();
  const [state, setState] = useState(() => (directories.get(directory) as T | undefined) ?? initial);

  useEffect(() => {
    directories.set(directory, state);
  }, [directories, directory, state]);

  const update = useCallback((changes: Partial<T>) => setState(previous => ({ ...previous, ...changes })), []);
  return [state, update] as const;
}

export function useRememberDirectoryScroll(directory: AccountDirectory) {
  const { scrollPositions } = useDashboardState();
  return () => scrollPositions.set(directory, window.scrollY);
}

export function useRestoreDirectoryScroll(directory: AccountDirectory, loaded: boolean) {
  const { scrollPositions } = useDashboardState();
  useEffect(() => {
    if (!loaded || !scrollPositions.has(directory)) return;
    const scroll = requestAnimationFrame(() => {
      window.scrollTo(0, scrollPositions.get(directory) ?? 0);
      scrollPositions.delete(directory);
    });
    return () => cancelAnimationFrame(scroll);
  }, [directory, loaded, scrollPositions]);
}
