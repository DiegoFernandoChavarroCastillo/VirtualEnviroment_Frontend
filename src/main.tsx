import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { SocketProvider } from '@/shared/contexts/SocketContext'
import { CurrentUserProvider } from '@/shared/contexts/CurrentUserContext'
import { AuthProvider } from '@/features/auth/contexts/AuthContext'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <SocketProvider>
        <CurrentUserProvider>
          <App />
        </CurrentUserProvider>
      </SocketProvider>
    </AuthProvider>
  </StrictMode>,
)
