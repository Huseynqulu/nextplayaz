import React from 'react'
import type { TemplateEntry } from './registry'
import { Shell, Text, Button, brand } from './_shared'

interface Props { name?: string; productTitle?: string; orderId?: string; reason?: string }

const Email = ({ name, productTitle, reason }: Props) => (
  <Shell preview="Sifarişiniz üçün mübahisə açıldı" title="Mübahisə açıldı ⚠️">
    <Text style={brand.text}>Salam {name || 'satıcı'},</Text>
    <Text style={brand.text}>
      <b>{productTitle || 'Məhsul'}</b> sifarişi üçün alıcı mübahisə açdı.
    </Text>
    {reason ? <Text style={{ ...brand.text, background: '#fff7ed', padding: '12px 14px', borderRadius: '10px', color: '#7c2d12' }}>Səbəb: {reason}</Text> : null}
    <Text style={brand.text}>Zəhmət olmasa dərhal alıcı ilə əlaqə saxlayın.</Text>
    <Button href="https://nextplay.az/seller-orders" style={brand.cta}>Sifarişə bax</Button>
  </Shell>
)

export const template = {
  component: Email,
  subject: 'Mübahisə açıldı — NextPlay.az',
  displayName: 'Satıcıya mübahisə bildirişi',
  previewData: { name: 'Rəşad', productTitle: 'FIFA 25', reason: 'Kod işləmir' },
} satisfies TemplateEntry
