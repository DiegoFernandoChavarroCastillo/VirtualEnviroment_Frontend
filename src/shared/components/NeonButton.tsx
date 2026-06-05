import { motion, type HTMLMotionProps } from 'framer-motion'
import { forwardRef, type ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface NeonButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: Variant
  size?: Size
  fullWidth?: boolean
  icon?: ReactNode
  loading?: boolean
  children?: ReactNode
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-neon-cyan/90 to-neon-blue/90 text-space-900 hover:from-neon-cyan hover:to-neon-blue shadow-glow-cyan',
  secondary:
    'bg-transparent text-neon-cyan border border-neon-cyan/60 hover:bg-neon-cyan/10 hover:shadow-glow-cyan',
  ghost:
    'bg-transparent text-foreground/80 border border-border hover:bg-muted/50 hover:text-foreground',
  danger:
    'bg-transparent text-red-400 border border-red-500/50 hover:bg-red-500/10 hover:shadow-[0_0_18px_rgba(239,68,68,0.45)]',
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2.5 text-sm rounded-xl',
  lg: 'px-6 py-3.5 text-base rounded-xl',
}

const NeonButton = forwardRef<HTMLButtonElement, NeonButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      icon,
      loading = false,
      disabled,
      className = '',
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <motion.button
        ref={ref}
        whileHover={!disabled && !loading ? { scale: 1.02 } : undefined}
        whileTap={!disabled && !loading ? { scale: 0.97 } : undefined}
        disabled={disabled || loading}
        className={[
          'inline-flex items-center justify-center gap-2 font-semibold transition-all',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan/70',
          variantClasses[variant],
          sizeClasses[size],
          fullWidth ? 'w-full' : '',
          className,
        ].join(' ')}
        {...props}
      >
        {loading ? (
          <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          icon && <span className="inline-flex items-center">{icon}</span>
        )}
        {children}
      </motion.button>
    )
  },
)
NeonButton.displayName = 'NeonButton'

export default NeonButton
