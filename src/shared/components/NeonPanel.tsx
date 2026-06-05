import { motion, type HTMLMotionProps } from 'framer-motion'
import { forwardRef, type ReactNode } from 'react'

type Accent = 'cyan' | 'violet' | 'magenta'

interface NeonPanelProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  accent?: Accent
  glow?: boolean
  hoverGlow?: boolean
  className?: string
  children?: ReactNode
}

const accentBorder: Record<Accent, string> = {
  cyan: 'border-neon-cyan/40 hover:border-neon-cyan/80',
  violet: 'border-neon-violet/40 hover:border-neon-violet/80',
  magenta: 'border-neon-magenta/40 hover:border-neon-magenta/80',
}

const accentGlow: Record<Accent, string> = {
  cyan: 'shadow-glow-cyan',
  violet: 'shadow-glow-violet',
  magenta: 'shadow-glow-magenta',
}

const NeonPanel = forwardRef<HTMLDivElement, NeonPanelProps>(
  ({ accent = 'cyan', glow = false, hoverGlow = false, className = '', children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={[
          'relative bg-glass border rounded-2xl transition-all duration-300',
          accentBorder[accent],
          glow ? accentGlow[accent] : '',
          hoverGlow ? `hover:${accentGlow[accent]}` : '',
          className,
        ].join(' ')}
        {...props}
      >
        {children}
      </motion.div>
    )
  },
)
NeonPanel.displayName = 'NeonPanel'

export default NeonPanel
