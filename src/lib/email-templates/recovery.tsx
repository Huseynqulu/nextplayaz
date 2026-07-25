import * as React from 'react'
import { Text, Button, Shell, brand } from './_shared'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({ confirmationUrl }: RecoveryEmailProps) => (
  <Shell preview="NextPlay.az — şifrənizi sıfırlayın" title="Şifrənizi sıfırlayın">
    <Text style={brand.text}>NextPlay.az hesabınız üçün şifrə sıfırlama sorğusu aldıq. Yeni şifrə təyin etmək üçün düyməyə basın.</Text>
    <Button style={brand.cta} href={confirmationUrl}>Şifrəni sıfırla</Button>
    <Text style={brand.small}>Sorğu sizdən deyilsə, emaili nəzərə almayın — şifrəniz dəyişməyəcək.</Text>
  </Shell>
)

export default RecoveryEmail
