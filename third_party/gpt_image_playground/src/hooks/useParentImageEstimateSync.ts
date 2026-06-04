import { useEffect } from 'react'
import { getActiveApiProfile } from '../lib/apiProfiles'
import { useStore } from '../store'

const MESSAGE_TYPE = 'hahacode:image-playground-params'

export function useParentImageEstimateSync() {
  const params = useStore((s) => s.params)
  const settings = useStore((s) => s.settings)

  useEffect(() => {
    if (window.parent === window) return
    const profile = getActiveApiProfile(settings)
    window.parent.postMessage({
      type: MESSAGE_TYPE,
      payload: {
        model: profile.model,
        apiMode: profile.apiMode,
        size: params.size,
        count: params.n,
      },
    }, window.location.origin)
  }, [params.n, params.size, settings])
}
