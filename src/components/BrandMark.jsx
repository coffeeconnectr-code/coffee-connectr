export default function BrandMark({
  titleAs: Title = 'span',
  titleClassName = '',
  className = '',
  logoClassName = '',
}) {
  return (
    <div className={`brand-mark${className ? ` ${className}` : ''}`}>
      <Title className={`brand-mark-title${titleClassName ? ` ${titleClassName}` : ''}`}>
        Coffee Connectr
      </Title>
      <img
        src="/logo.png"
        alt=""
        className={`brand-mark-logo${logoClassName ? ` ${logoClassName}` : ''}`}
        aria-hidden="true"
      />
    </div>
  )
}
