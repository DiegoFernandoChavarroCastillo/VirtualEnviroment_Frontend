import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { X, ExternalLink } from 'lucide-react';
import { PlayerCardData } from '../hooks/usePlayerCard';
import { translateProgram } from '@/shared/utils/programTranslations';
import { SafeRemoteImage } from '@/shared/components/SafeRemoteImage';

interface PlayerCardProps {
  card: PlayerCardData | null;
  loading: boolean;
  viewportWidth: number;
  viewportHeight: number;
  onClose: () => void;
}

interface CardAvatarProps {
  name: string;
  profilePicURL?: string;
}

const CARD_W = 220;
const CARD_H = 160;

function CardAvatar({ name, profilePicURL }: CardAvatarProps) {
  if (profilePicURL) {
    return (
      <SafeRemoteImage
        src={profilePicURL}
        alt={name}
        className="w-10 h-10 rounded-full object-cover border-2 border-border"
        fallback="initials"
      />
    );
  }
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm border-2 border-border"
      style={{ background: 'hsl(146 45% 52%)' }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function PlayerCardProfileDetails({ card }: { card: PlayerCardData }) {
  const profile = card.profile;
  const program = profile?.programs?.[0];
  const semester = profile?.semester;

  return (
    <div className="min-w-0 flex-1 pr-5">
      <p className="font-semibold text-sm text-foreground truncate leading-tight">{card.name}</p>
      {program != null && program !== '' && (
        <p className="text-[11px] text-muted-foreground truncate leading-tight mt-0.5">
          {translateProgram(program)}
        </p>
      )}
      {semester != null && (
        <p className="text-[10px] text-muted-foreground/70 leading-tight">
          Semestre {semester}
        </p>
      )}
    </div>
  );
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  card,
  loading,
  viewportWidth,
  viewportHeight,
  onClose,
}) => {
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    globalThis.addEventListener('keydown', handler);
    return () => globalThis.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const t = setTimeout(() => document.addEventListener('mousedown', handler), 50);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', handler);
    };
  }, [onClose]);

  const getPosition = () => {
    if (!card) return { left: 0, top: 0 };
    const OFFSET = 20;
    let left = card.viewportX - CARD_W / 2;
    let top = card.viewportY - CARD_H - OFFSET;
    left = Math.max(8, Math.min(left, viewportWidth - CARD_W - 8));
    if (top < 8) top = card.viewportY + 30;
    top = Math.min(top, viewportHeight - CARD_H - 8);
    return { left, top };
  };

  const pos = getPosition();

  const viewProfile = () => {
    if (card) navigate(`/profile/${card.profileId}`);
  };

  let cardBody: React.ReactNode = null;
  if (loading && !card) {
    cardBody = (
      <div className="flex items-center justify-center h-24">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  } else if (card) {
    const interests = card.profile?.interests ?? [];
    const profilePicURL = card.profile?.profilePicURL;

    cardBody = (
      <>
        <div className="flex items-center gap-3 p-3 pb-2">
          <div className="relative flex-shrink-0">
            <CardAvatar name={card.name} profilePicURL={profilePicURL} />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-card" />
          </div>
          <PlayerCardProfileDetails card={card} />
        </div>

        {interests.length > 0 && (
          <div className="px-3 pb-2 flex flex-wrap gap-1">
            {interests.slice(0, 3).map((interest) => (
              <span
                key={interest.id}
                className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium"
              >
                {interest.name}
              </span>
            ))}
          </div>
        )}

        <div className="mx-3 border-t border-border" />

        <div className="p-2.5 flex gap-2">
          <button
            type="button"
            onClick={viewProfile}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
          >
            <ExternalLink size={12} />
            Ver perfil
          </button>
        </div>
      </>
    );
  }

  return (
    <AnimatePresence>
      {(card || loading) && (
        <motion.div
          ref={cardRef}
          key="player-card"
          initial={{ opacity: 0, scale: 0.88, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.88, y: 8 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          style={{ left: pos.left, top: pos.top, width: CARD_W }}
          className="absolute z-30 rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-xl overflow-hidden"
          role="dialog"
          aria-label={card ? `Perfil de ${card.name}` : 'Cargando perfil'}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute top-2 right-2 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors z-10"
            aria-label="Cerrar"
          >
            <X size={14} />
          </button>
          {cardBody}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
