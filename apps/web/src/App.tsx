import { useEffect } from 'react'
import { Outlet } from 'react-router'

import { RootProviders } from './providers/root-providers'

// prefetch preview page route
function App() {
  useEffect(() => {
    import('~/pages/(main)/[photoId]/index')
    import('~/pages/(main)/explory/index')
  }, [])
  return (
    <RootProviders>
      <div className="overflow-hidden lg:h-svh">
        <Outlet />
      </div>
    </RootProviders>
  )
}

export default App
