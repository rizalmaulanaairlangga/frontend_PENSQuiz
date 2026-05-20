import { Link } from 'react-router-dom'

export function BrandLogo({
  to = '/dashboard',
  ariaLabel = 'PENSQuiz',
  className = 'w-[154px] sm:w-[176px]',
}: {
  to?: string
  ariaLabel?: string
  className?: string
}) {
  return (
    <Link
      to={to}
      aria-label={ariaLabel}
      className={`inline-flex shrink-0 items-center focus:outline-none ${className}`}
    >
      <img
        src="/assets/images/img_logo.png"
        alt={ariaLabel}
        className="block h-auto w-full object-contain"
      />
    </Link>
  )
}

