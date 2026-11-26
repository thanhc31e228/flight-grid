import { createContext, ReactNode, useContext, useMemo } from "react";

import { useAircrafts } from "../hooks/useAircrafts";
import type { AirCraft, Point } from "../components/MapTiler/types/map.types";
import { AircraftDetails } from "../components/controls/factory/aircraft.factory";

interface AirCraftContextType {
  aircrafts: AirCraft[];
  selectedAircraftId: string | null;
  aircraftSelected: AirCraft | null;
  setAircraftSelected: (aircraft: AirCraft | null) => void; // đổi dòng này
  getLastPoint: (aircaftId: string) => Point | undefined;
  setSelectedAircraftId: (id: string | null) => void;
  addAircraft: (aircraft: AirCraft) => AirCraft;
  updateAircraft: (aircraftId: string, details: AircraftDetails) => void;
  updateSpeed: (aircraftId: string, newSpeed: number) => void;
  removeAirCraft: (aircraftId: string) => number;
  addPoint: (aircraftId: string, point: Point) => number;
  undoPoint: (aircraftId: string) => number;
  clearPoints: (aircraftId: string) => void;
  setRoute: (aircraftId: string, points: Point[]) => void;
}
const AirCraftContext = createContext<AirCraftContextType | undefined>(
  undefined,
);

export default function MakerProvider({ children }: { children: ReactNode }) {
  const {
    aircrafts,
    selectedAircraftId,
    setSelectedAircraftId,
    aircraftSelected,
    setAircraftSelected,
    addAircraft,
    updateSpeed,
    updateAircraft,
    getLastPoint,
    removeAircraft,
    addPoint,
    undoPoint,
    clearPoints,
    setRoute,
  } = useAircrafts();

  const value = useMemo(
    () => ({
      aircrafts,
      selectedAircraftId,
      setSelectedAircraftId,
      setAircraftSelected,
      aircraftSelected,
      addAircraft,
      updateAircraft,
      updateSpeed,
      removeAirCraft: removeAircraft,
      addPoint,
      getLastPoint,
      undoPoint,
      clearPoints,
      setRoute,
    }),
    [
      aircrafts,
      selectedAircraftId,
      aircraftSelected,
      setAircraftSelected,
      setSelectedAircraftId,
      addAircraft,
      updateAircraft,
      updateSpeed,
      removeAircraft,
      getLastPoint,
      addPoint,
      undoPoint,
      clearPoints,
      setRoute,
    ],
  );

  return (
    <AirCraftContext.Provider value={value}>
      {children}
    </AirCraftContext.Provider>
  );
}

export function useAirCraftContext() {
  const context = useContext(AirCraftContext);

  if (!context) {
    throw new Error("useAirCraft must be used inside MakerProvider");
  }

  return context;
}
