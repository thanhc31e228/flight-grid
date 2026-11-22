import MapTiler from "./app/MapTiler";
import MakerProvider from "./context/MakerContext";
import MapProvider from "./context/MapContext";

function App() {
  return (
    <MapProvider>
      <MakerProvider>
        <MapTiler />
      </MakerProvider>
    </MapProvider>
  );
}

export default App;
