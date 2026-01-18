import { createRoot } from "react-dom/client"
import "./styles.css"
import GameCanvas from "./components/GameCanvas"
import LobbyView from "./components/LobbyView"
import ThemeController from "./components/ThemeController"

import "react-grid-layout/css/styles.css"
import "react-resizable/css/styles.css"
import GridLayout from "react-grid-layout"

function App() {
  const params = new URLSearchParams(window.location.search)
  const room = params.get("room")

  const layout = [
    { i: "a", x: 0, y: 0, w: 1, h: 2 },
    { i: "b", x: 1, y: 0, w: 3, h: 2 },
    { i: "c", x: 4, y: 0, w: 1, h: 2 },
  ]

  return (
    <main>
      {/* <GridLayout className="layout" layout={layout} width={1200}>
        <div key="a">a</div>
        <div key="b">b</div>
        <div key="c">c</div>
      </GridLayout> */}

      <ThemeController />
      {room ? <GameCanvas room={room} /> : <LobbyView />}
    </main>
  )
}

createRoot(document.getElementById("app")!).render(<App />)
