import React from 'react'
import { Body, Container, Head, Heading, Html, Preview, Section, Text, Button, Hr } from '@react-email/components'

export const brand = {
  main: { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif', margin: 0, padding: '24px 0' },
  container: { maxWidth: '560px', margin: '0 auto', padding: '32px 28px', border: '1px solid #e5e7eb', borderRadius: '14px', backgroundColor: '#ffffff' },
  header: { fontSize: '22px', color: '#0b0f19', margin: '0 0 8px', fontWeight: 700 },
  text: { fontSize: '15px', lineHeight: '22px', color: '#334155', margin: '0 0 12px' },
  small: { fontSize: '12px', color: '#64748b', margin: '16px 0 0' },
  cta: { backgroundColor: '#7c3aed', color: '#ffffff', padding: '12px 20px', borderRadius: '10px', textDecoration: 'none', fontWeight: 600, display: 'inline-block' },
  hr: { borderColor: '#e5e7eb', margin: '20px 0' },
  logo: { fontSize: '18px', fontWeight: 800, color: '#7c3aed', letterSpacing: '0.5px', marginBottom: '16px' },
}

export function Shell({ preview, title, children }: { preview: string; title: string; children: React.ReactNode }) {
  return (
    <Html lang="az">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={brand.main}>
        <Container style={brand.container}>
          <Text style={brand.logo}>NextPlay.az</Text>
          <Heading style={brand.header}>{title}</Heading>
          {children}
          <Hr style={brand.hr} />
          <Text style={brand.small}>Bu email NextPlay.az tərəfindən avtomatik göndərilib. Cavab vermək lazım deyil.</Text>
        </Container>
      </Body>
    </Html>
  )
}

export { Button, Section, Text }
