import { useCallback, useRef, useState } from "react";
import { GridSType } from "../context/MapContext";

export function useMap() {
  const gridSelectedRef = useRef<GridSType | undefined>(undefined);
  const [gridSelected, setGridSelected] = useState<GridSType>();

  const commitGridSelected = useCallback((updated: GridSType) => {
    gridSelectedRef.current = updated;
    setGridSelected(updated);
  }, []);

  return {
    gridSelected,
    commitGridSelected,
  };
}
