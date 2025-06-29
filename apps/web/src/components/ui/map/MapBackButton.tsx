import { m } from 'motion/react'
import { startTransition } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'

import { Button } from '~/components/ui/button'

export const MapBackButton = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const handleBack = () => {
    startTransition(() => {
      navigate('/')
    })
  }

  return (
    <m.div
      className="absolute top-4 left-4 z-50"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={handleBack}
        className="h-10 w-10 rounded-full border border-white/20 bg-black/50 backdrop-blur-sm transition-all duration-200 hover:bg-black/70"
        title={t('explory.back.to.gallery')}
      >
        <i className="i-mingcute-arrow-left-line text-base text-white" />
      </Button>
    </m.div>
  )
}
