import * as React from 'react'
import { Text, Button, Shell, brand } from './_shared'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({ confirmationUrl }: InviteEmailProps) => (
  <Shell preview="NextPlay.az — sizə dəvət göndərildi" title="Sizə dəvət göndərildi">
    <Text style={brand.text}>NextPlay.az-a qoşulmaq üçün dəvət aldınız. Hesab yaratmaq üçün aşağıdakı düyməni basın.</Text>
    <Button style={brand.cta} href={confirmationUrl}>Dəvəti qəbul et</Button>
    <Text style={brand.small}>Bu dəvəti gözləmirdinizsə, emaili nəzərə almayın.</Text>
  </Shell>
)

export default InviteEmail
