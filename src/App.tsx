import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Lobby from '@/pages/Lobby'
import Login from '@/pages/Login'
import Register from '@/pages/Register'
import VirtualWorldScreen from '@/features/virtual-world/pages/VirtualWorldScreen'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Lobby />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/virtual-world" element={<VirtualWorldScreen />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
