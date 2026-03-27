import { useContext } from "react";
import { RoleContext } from "../context";
import type { RoleContextValue } from "../types";

export function useRole(): RoleContextValue {
  return useContext(RoleContext);
}
