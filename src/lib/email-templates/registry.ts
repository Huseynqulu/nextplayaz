import type { ComponentType } from 'react'
import { template as topupApproved } from './topup-approved'
import { template as orderPlacedBuyer } from './order-placed-buyer'
import { template as newSaleSeller } from './new-sale-seller'
import { template as newMessage } from './new-message'
import { template as disputeOpened } from './dispute-opened'
import { template as supportReply } from './support-reply'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  to?: string
}

export const TEMPLATES: Record<string, TemplateEntry> = {
  'topup-approved': topupApproved,
  'order-placed-buyer': orderPlacedBuyer,
  'new-sale-seller': newSaleSeller,
  'new-message': newMessage,
  'dispute-opened': disputeOpened,
  'support-reply': supportReply,
}
