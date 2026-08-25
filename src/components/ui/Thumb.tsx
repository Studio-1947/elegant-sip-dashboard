import { useState } from 'react'
import { assetUrl } from '../../lib/assets'

/**
 * A product thumbnail with an honest fallback: no copy of the image, or a load
 * failure, gives an initial tile rather than a broken-image glyph. Explicit
 * width and height, so nothing shifts as the image arrives.
 */
export function Thumb({
  imageSrc,
  name,
  size = 44,
}: {
  imageSrc?: string
  name: string
  size?: number
}) {
  const [failed, setFailed] = useState(false)
  const url = assetUrl(imageSrc)

  if (!url || failed) {
    return (
      <span
        className="grid shrink-0 place-items-center rounded-lg bg-accent/10 text-xs font-bold text-accent"
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        {name.charAt(0).toUpperCase()}
      </span>
    )
  }

  return (
    <img
      src={url}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className="shrink-0 rounded-lg object-cover"
      style={{ width: size, height: size }}
    />
  )
}
