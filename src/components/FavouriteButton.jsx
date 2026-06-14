import { useEffect, useState } from 'react'
import { addFavourite, removeFavourite } from '../lib/favouritesApi'

export default function FavouriteButton({
  currentUserId,
  profileUserId,
  initialSaved = false,
  onChange,
  className = '',
  disabled = false,
}) {
  const [saved, setSaved] = useState(initialSaved)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setSaved(initialSaved)
  }, [initialSaved])

  if (!currentUserId || currentUserId === profileUserId) {
    return null
  }

  async function handleToggle() {
    if (loading || disabled) {
      return
    }

    setLoading(true)

    try {
      if (saved) {
        await removeFavourite(currentUserId, profileUserId)
        setSaved(false)
        onChange?.(false)
      } else {
        await addFavourite(currentUserId, profileUserId)
        setSaved(true)
        onChange?.(true)
      }
    } catch (error) {
      window.alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      className={`secondary-button favourite-button${saved ? ' favourite-button-saved' : ''} ${className}`.trim()}
      onClick={handleToggle}
      disabled={loading || disabled}
      aria-pressed={saved}
    >
      {loading ? 'Saving...' : saved ? 'Saved' : 'Save profile'}
    </button>
  )
}
