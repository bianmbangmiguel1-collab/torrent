import type { ReactNode } from 'react'
import StorefrontFrame from '@/components/StorefrontFrame'

export default function CategoryLayout({ children }: { children: ReactNode }) {
  return <StorefrontFrame>{children}</StorefrontFrame>
}
