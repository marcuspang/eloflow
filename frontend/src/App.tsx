import { GameProvider } from "@/components/game-context";
import { HomePage } from "@/components/home-page";
import { setupFlow } from "@/lib/flow";

setupFlow();

function App() {
  return (
    <GameProvider>
      <HomePage />
    </GameProvider>
  );
}

export default App;
