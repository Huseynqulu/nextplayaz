import * as React from 'react'
import { Text, Button, Shell, brand } from './_shared'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({ recipient, confirmationUrl }: SignupEmailProps) => (
  <Shell preview="NextPlay.az — email ünvanınızı təsdiqləyin" title="Email ünvanınızı təsdiqləyin">
    <Text style={brand.text}>NextPlay.az-a xoş gəlmisiniz! Qeydiyyatı tamamlamaq üçün <strong>{recipient}</strong> ünvanını təsdiqləyin.</Text>
    <Button style={brand.cta} href={confirmationUrl}>Emaili təsdiqlə</Button>
    <Text style={brand.small}>Əgər hesab yaratmamısınızsa, bu emaili nəzərə almayın.</Text>
  </Shell>
)

export default SignupEmail
