import { GameProvider } from "@/components/game-context";
import { Lobby } from "@/components/lobby";
import { setupFlow } from "@/lib/flow";

setupFlow();

function App() {
  return (
    <GameProvider>
      <Lobby />
    </GameProvider>
  );
}

export default App;
