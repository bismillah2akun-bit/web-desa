import { createContext, useContext } from "react";

export const ConfirmContext = createContext(null);
export function useConfirm() {
  return useContext(ConfirmContext);
}
