import React from 'react'
import type { TemplateEntry } from './registry'
import { Shell, Text, Button, brand } from './_shared'

interface Props { name?: string; senderName?: string; snippet?: string; conversationId?: string }

const Email = ({ name, senderName, snippet, conversationId }: Props) => (
  <Shell preview={`${senderName || 'İstifadəçi'} sizə mesaj göndərdi`} title="Yeni mesaj 💬">
    <Text style={brand.text}>Salam {name || 'istifadəçi'},</Text>
    <Text style={brand.text}><b>{senderName || 'Bir istifadəçi'}</b> sizə mesaj yazıb:</Text>
    {snippet ? <Text style={{ ...brand.text, background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', color: '#0f172a' }}>{snippet}</Text> : null}
    <Button href={conversationId ? `https://nextplay.az/messages/${conversationId}` : 'https://nextplay.az/messages'} style={brand.cta}>Söhbətə keç</Button>
  </Shell>
)

export const template = {
  component: Email,
  subject: 'Yeni mesaj — NextPlay.az',
  displayName: 'Yeni mesaj bildirişi',
  previewData: { name: 'Əli', senderName: 'Rəşad', snippet: 'Salam, məhsul hazırdır' },
} satisfies TemplateEntry
