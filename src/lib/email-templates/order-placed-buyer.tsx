import React from 'react'
import type { TemplateEntry } from './registry'
import { Shell, Text, Button, brand } from './_shared'

interface Props { name?: string; productTitle?: string; amount?: number; orderId?: string }

const Email = ({ name, productTitle, amount, orderId }: Props) => (
  <Shell preview="Sifarişiniz uğurla yaradıldı" title="Sifariş qəbul olundu 🎮">
    <Text style={brand.text}>Salam {name || 'istifadəçi'},</Text>
    <Text style={brand.text}>
      <b>{productTitle || 'Məhsul'}</b> üçün sifarişiniz uğurla yaradıldı. Məbləğ: <b>{amount ?? 0} ₼</b>.
    </Text>
    <Text style={brand.text}>Satıcı ilə söhbət avtomatik açılıb — məhsul çatdırıldıqdan sonra təsdiq edin.</Text>
    <Button href={`https://nextplay.az/orders`} style={brand.cta}>Sifarişlərimə keç</Button>
  </Shell>
)

export const template = {
  component: Email,
  subject: 'Sifarişiniz qəbul olundu — NextPlay.az',
  displayName: 'Alıcıya sifariş təsdiqi',
  previewData: { name: 'Əli', productTitle: 'FIFA 25', amount: 45 },
} satisfies TemplateEntry
