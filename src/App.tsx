import MapTiler from "./app/MapTiler";
import MapProvider from "./context/MapContext";

function App() {
  return (
    <MapProvider>
      <MapTiler />
    </MapProvider>
  );
}

export default App;
