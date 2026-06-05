import React, { useEffect } from 'react';
import VirtualWorld from '@/features/virtual-world/components/VirtualWorld';
import { motion } from 'framer-motion';
import { ChevronLeft, Gamepad2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '@/shared/contexts/SocketContext';
import Starfield from '@/shared/components/Starfield';

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
    <div className="relative min-h-screen bg-background text-foreground flex flex-col overflow-hidden">
      <Starfield density={140} />

      <header className="relative z-10 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-3 sm:gap-4 border-b border-neon-cyan/20 bg-space-900/60 backdrop-blur-md sticky top-0">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleBack}
          className="p-2 rounded-xl bg-space-900/60 border border-border text-foreground hover:border-neon-cyan/60 hover:shadow-glow-cyan transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan/70 shrink-0"
          aria-label="Volver al lobby"
        >
          <ChevronLeft size={20} />
        </motion.button>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-neon-cyan to-neon-violet flex items-center justify-center shadow-glow-cyan shrink-0">
            <Gamepad2 className="w-4 h-4 text-space-900" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-display font-extrabold tracking-widest text-glow-cyan text-neon-cyan leading-none">
              BOX.IO
            </h1>
            <p className="hidden xs:block text-[9px] uppercase tracking-[0.3em] text-neon-violet/80 mt-1">
              Sala de juegos multijugador
            </p>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 p-3 sm:p-4 lg:p-6 flex items-center justify-center">
        <VirtualWorld />
      </main>
    </div>
  );
};

export default VirtualWorldScreen;
