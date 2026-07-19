import React from 'react'
import type { TemplateEntry } from './registry'
import { Shell, Text, Button, brand } from './_shared'

interface Props { name?: string; ticketId?: string; snippet?: string }

const Email = ({ name, ticketId, snippet }: Props) => (
  <Shell preview="Dəstək müraciətinizə cavab gəldi" title="Dəstəkdən yeni cavab 🛟">
    <Text style={brand.text}>Salam {name || 'istifadəçi'},</Text>
    <Text style={brand.text}>Dəstək müraciətinizə yeni cavab gəldi:</Text>
    {snippet ? <Text style={{ ...brand.text, background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', color: '#0f172a' }}>{snippet}</Text> : null}
    <Button href={ticketId ? `https://nextplay.az/support-tickets` : 'https://nextplay.az/support-tickets'} style={brand.cta}>Müraciətə keç</Button>
  </Shell>
)

export const template = {
  component: Email,
  subject: 'Dəstəkdən cavab — NextPlay.az',
  displayName: 'Dəstək cavabı bildirişi',
  previewData: { name: 'Əli', snippet: 'Salam, məsələ araşdırılır' },
} satisfies TemplateEntry
