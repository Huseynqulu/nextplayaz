import React from 'react'
import type { TemplateEntry } from './registry'
import { Shell, Text, Button, brand } from './_shared'

interface Props { name?: string; productTitle?: string; amount?: number }

const Email = ({ name, productTitle, amount }: Props) => (
  <Shell preview="Yeni satış — məhsulu tez bir zamanda çatdırın" title="Yeni satış 🎉">
    <Text style={brand.text}>Salam {name || 'satıcı'},</Text>
    <Text style={brand.text}>
      <b>{productTitle || 'Məhsul'}</b> satıldı. Ödəniş məbləği: <b>{amount ?? 0} ₼</b>.
    </Text>
    <Text style={brand.text}>Alıcı ilə mesajlaşmadan məhsulu tez bir zamanda çatdırın. Ödəniş 48 saat sonra balansınıza yüklənəcək.</Text>
    <Button href="https://nextplay.az/seller-orders" style={brand.cta}>Satışları aç</Button>
  </Shell>
)

export const template = {
  component: Email,
  subject: 'Yeni satış — NextPlay.az',
  displayName: 'Satıcıya yeni sifariş bildirişi',
  previewData: { name: 'Rəşad', productTitle: 'PS Plus 12 ay', amount: 89 },
} satisfies TemplateEntry
