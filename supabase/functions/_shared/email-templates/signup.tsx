/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Confirme seu email — Sommelyx</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Text style={logoText}>Sommelyx</Text>
          <Text style={logoTagline}>sua adega inteligente</Text>
        </Section>
        <Hr style={divider} />
        <Heading style={h1}>Confirme seu email</Heading>
        <Text style={text}>
          Bem-vindo(a) à Sommelyx. Sua adega digital começa aqui.
        </Text>
        <Text style={text}>
          Confirme seu email para ativar sua conta e começar a organizar sua coleção:
        </Text>
        <Section style={buttonSection}>
          <Button style={button} href={confirmationUrl}>
            Confirmar email
          </Button>
        </Section>
        <Text style={footer}>
          Se você não criou uma conta na Sommelyx, pode ignorar este email com segurança.
        </Text>
        <Hr style={dividerLight} />
        <Text style={brand}>Sommelyx — sua adega inteligente.</Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = {
  backgroundColor: '#F6F3F2',
  fontFamily: "'Georgia', 'Times New Roman', serif",
  padding: '40px 0',
}
const container = {
  backgroundColor: '#ffffff',
  padding: '40px 36px 32px',
  maxWidth: '520px',
  margin: '0 auto',
  borderRadius: '16px',
  border: '1px solid #E8E4E2',
}
const logoSection = { textAlign: 'center' as const, marginBottom: '8px' }
const logoText = {
  fontSize: '28px',
  fontWeight: 'bold' as const,
  fontStyle: 'italic' as const,
  color: '#7B1E3A',
  margin: '0',
  letterSpacing: '-0.5px',
}
const logoTagline = {
  fontSize: '11px',
  color: '#9B8A8A',
  margin: '2px 0 0',
  letterSpacing: '2px',
  textTransform: 'uppercase' as const,
}
const divider = { borderColor: '#E8E4E2', margin: '20px 0 28px' }
const dividerLight = { borderColor: '#F0ECEB', margin: '28px 0 16px' }
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#1A1A24',
  margin: '0 0 16px',
  textAlign: 'center' as const,
}
const text = {
  fontSize: '15px',
  color: '#5B5564',
  lineHeight: '1.6',
  margin: '0 0 16px',
  textAlign: 'center' as const,
}
const buttonSection = { textAlign: 'center' as const, margin: '28px 0' }
const button = {
  backgroundColor: '#7B1E3A',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  borderRadius: '10px',
  padding: '14px 32px',
  textDecoration: 'none',
}
const footer = {
  fontSize: '13px',
  color: '#9B8A8A',
  margin: '0',
  textAlign: 'center' as const,
  lineHeight: '1.5',
}
const brand = {
  fontSize: '11px',
  color: '#BEB3B3',
  textAlign: 'center' as const,
  margin: '0',
  fontStyle: 'italic' as const,
}
