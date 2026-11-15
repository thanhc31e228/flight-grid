import MapTiler from "./app/MapTiler";
import MakerProvider from "./context/MakerContext";

function App() {
  return (
    <MakerProvider>
      <MapTiler />
    </MakerProvider>
  );
}

export default App;
