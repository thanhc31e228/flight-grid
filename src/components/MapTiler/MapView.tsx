
import { RefObject } from "react";

type Props = {
  mapContainer: RefObject<HTMLDivElement | null>;
};

export default function MapView({ mapContainer }: Props) {
  return (
    <div
      ref={mapContainer}
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#eee",
        borderRadius: 8,
      }}
    />
  );
}