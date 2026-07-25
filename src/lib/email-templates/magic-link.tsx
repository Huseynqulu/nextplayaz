import * as React from 'react'
import { Text, Button, Shell, brand } from './_shared'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({ confirmationUrl }: MagicLinkEmailProps) => (
  <Shell preview="NextPlay.az — giriş linkiniz" title="Giriş linkiniz">
    <Text style={brand.text}>Aşağıdakı düymə ilə NextPlay.az hesabınıza daxil olun. Link qısa müddət ərzində etibarlıdır.</Text>
    <Button style={brand.cta} href={confirmationUrl}>Daxil ol</Button>
    <Text style={brand.small}>Bu linki siz tələb etməmisinizsə, emaili nəzərə almayın.</Text>
  </Shell>
)

export default MagicLinkEmail
