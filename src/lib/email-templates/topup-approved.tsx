import React from 'react'
import type { TemplateEntry } from './registry'
import { Shell, Text, Button, brand } from './_shared'

interface Props { name?: string; amount?: number }

const Email = ({ name, amount }: Props) => (
  <Shell preview="Balans artırma tələbiniz təsdiqləndi" title="Balansınız artırıldı ✅">
    <Text style={brand.text}>Salam {name || 'istifadəçi'},</Text>
    <Text style={brand.text}>
      Balans artırma tələbiniz təsdiqləndi. Hesabınıza <b>{amount ?? 0} ₼</b> əlavə olundu.
    </Text>
    <Button href="https://nextplay.az/wallet" style={brand.cta}>Cüzdanı aç</Button>
  </Shell>
)

export const template = {
  component: Email,
  subject: 'Balansınız artırıldı — NextPlay.az',
  displayName: 'Balans artırma təsdiqi',
  previewData: { name: 'Əli', amount: 25 },
} satisfies TemplateEntry
