import React, { useEffect } from 'react';
import VirtualWorld from '@/features/virtual-world/components/VirtualWorld';
import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '@/shared/contexts/SocketContext';

const VirtualWorldScreen = () => {
  const navigate = useNavigate();
  const { socket } = useSocket();

  useEffect(() => {
    return () => {
      if (socket?.connected) {
        socket.emit('leaveMap');
      }
    };
  }, [socket]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (socket?.connected) {
        socket.emit('leaveMap');
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [socket]);

  const handleBack = () => {
    if (socket?.connected) {
      socket.emit('leaveMap');
    }
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-4 py-4 flex items-center gap-4 bg-card border-b border-border sticky top-0 z-50">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleBack}
          className="p-2 rounded-xl bg-muted border border-border text-foreground hover:bg-muted/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Volver al lobby"
        >
          <ChevronLeft size={20} />
        </motion.button>
        <div>
          <h1 className="text-xl font-display font-extrabold text-foreground">Box.io</h1>
          <p className="text-xs font-medium text-muted-foreground">Sala de juegos multijugador</p>
        </div>
      </header>

      <main className="flex-1 p-4 lg:p-8 flex items-center justify-center">
        <VirtualWorld />
      </main>
    </div>
  );
};

export default VirtualWorldScreen;
