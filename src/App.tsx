import MapTiler from "./app/MapTiler";
import MakerProvider from "./context/MakerContext";
import MapProvider from "./context/MapContext";
import { PlaceProvider } from "./context/PlaceContext";

function App() {
  return (
    <MapProvider>
      <MakerProvider>
        <PlaceProvider>
          <MapTiler />
        </PlaceProvider>
      </MakerProvider>
    </MapProvider>
  );
}

export default App;
