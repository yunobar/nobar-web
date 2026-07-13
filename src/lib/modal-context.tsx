import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ModalState = { type: "add" } | { type: "createGroup" } | null;

interface ModalContextValue {
  modal: ModalState;
  openAddModal: () => void;
  openCreateGroupModal: () => void;
  closeModal: () => void;
}

const ModalContext = createContext<ModalContextValue | null>(null);

export function ModalProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [modal, setModal] = useState<ModalState>(null);

  const value = useMemo<ModalContextValue>(
    () => ({
      modal,
      openAddModal: () => setModal({ type: "add" }),
      openCreateGroupModal: () => setModal({ type: "createGroup" }),
      closeModal: () => setModal(null),
    }),
    [modal],
  );

  return (
    <ModalContext.Provider value={value}>{children}</ModalContext.Provider>
  );
}

export function useModal(): ModalContextValue {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error("useModal must be used within ModalProvider");
  return ctx;
}
