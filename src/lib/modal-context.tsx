import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { GroupMember } from "@/lib/api";

export type ModalState =
  | { type: "add" }
  | { type: "createGroup" }
  | { type: "manualWatch"; gid: string; tid: string; title: string; members: GroupMember[] }
  | null;

interface ModalContextValue {
  modal: ModalState;
  openAddModal: () => void;
  openCreateGroupModal: () => void;
  openManualWatchModal: (payload: {
    gid: string;
    tid: string;
    title: string;
    members: GroupMember[];
  }) => void;
  closeModal: () => void;
}

const ModalContext = createContext<ModalContextValue | null>(null);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<ModalState>(null);

  const value = useMemo<ModalContextValue>(
    () => ({
      modal,
      openAddModal: () => setModal({ type: "add" }),
      openCreateGroupModal: () => setModal({ type: "createGroup" }),
      openManualWatchModal: (payload) => setModal({ type: "manualWatch", ...payload }),
      closeModal: () => setModal(null),
    }),
    [modal]
  );

  return <ModalContext.Provider value={value}>{children}</ModalContext.Provider>;
}

export function useModal(): ModalContextValue {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error("useModal must be used within ModalProvider");
  return ctx;
}
