import * as React from 'react'
import { Text, Button, Shell, brand } from './_shared'

interface EmailChangeEmailProps {
  siteName: string
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({ oldEmail, newEmail, confirmationUrl }: EmailChangeEmailProps) => (
  <Shell preview="NextPlay.az — email dəyişikliyini təsdiqləyin" title="Email dəyişikliyini təsdiqləyin">
    <Text style={brand.text}>NextPlay.az hesabınız üçün email ünvanını <strong>{oldEmail}</strong> → <strong>{newEmail}</strong> dəyişmək istədiniz.</Text>
    <Button style={brand.cta} href={confirmationUrl}>Dəyişikliyi təsdiqlə</Button>
    <Text style={brand.small}>Bu dəyişikliyi siz tələb etməmisinizsə, dərhal hesabınızı qoruyun.</Text>
  </Shell>
)

export default EmailChangeEmail
