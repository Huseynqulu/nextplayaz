import * as React from 'react'
import { Text, Shell, brand } from './_shared'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Shell preview="NextPlay.az — təsdiq kodunuz" title="Kimliyinizi təsdiqləyin">
    <Text style={brand.text}>Aşağıdakı kod ilə kimliyinizi təsdiqləyin:</Text>
    <Text style={{ fontFamily: 'Courier, monospace', fontSize: '26px', fontWeight: 700, color: '#0b0f19', letterSpacing: '4px', margin: '8px 0 20px' }}>{token}</Text>
    <Text style={brand.small}>Kod qısa müddət ərzində etibarlıdır. Sorğu sizdən deyilsə, emaili nəzərə almayın.</Text>
  </Shell>
)

export default ReauthenticationEmail
