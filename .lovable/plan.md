

# WineVault — SaaS de Gestão de Adega de Vinhos

## Visão Geral
Construir as telas fundacionais de um SaaS premium de gestão de adega, com design de alto padrão visual, em português (PT-BR), usando Lovable Cloud (Supabase) para backend.

---

## 1. Design System Premium
- Paleta: vinho profundo (#5B0F2F), dourado suave (#C9A96E), off-white (#FAF8F5), cinzas sofisticados
- Tipografia: Inter com hierarquia clara
- Cantos arredondados (2xl), sombras suaves, micro-animações com framer-motion
- Componentes base: Cards com glassmorphism sutil, botões elegantes, skeleton loading

## 2. Landing Page
- Hero impactante com headline forte: "Sua adega, inteligente."
- Ilustração/visual premium de vinhos
- Seção de funcionalidades com ícones elegantes
- Seção de planos (Free / Pro / Business) com cards comparativos
- CTA claro para começar gratuitamente
- Footer profissional

## 3. Seleção de Perfil
- Tela elegante pós-registro com duas opções grandes:
  - 🍷 **Adega Pessoal** — para colecionadores
  - 🏢 **Adega Comercial** — para negócios
- Essa escolha é salva no perfil do usuário e define toda a experiência

## 4. Autenticação
- Telas de Login e Cadastro com design premium
- Autenticação por email/senha via Supabase Auth
- Tabela `profiles` com campos: nome, avatar, tipo de perfil (pessoal/comercial)
- Tabela `user_roles` para controle de permissões
- Redirecionamento inteligente pós-login baseado no tipo de perfil

## 5. Dashboard — Adega Pessoal
- Layout com sidebar elegante (collapsible)
- Cards de métricas: total de garrafas, valor da adega, vinhos no auge, últimas adições
- Gráficos: distribuição por país/região, evolução da coleção
- Lista recente de vinhos adicionados
- Empty states elegantes com CTAs

## 6. Dashboard — Adega Comercial
- Mesma estrutura visual, métricas diferentes:
  - Faturamento do mês, estoque total, produtos críticos, vendas recentes, margem média
- Gráficos: vendas por período, curva de estoque
- Alertas de estoque baixo
- Empty states com CTAs comerciais

## 7. Navegação
- Sidebar com ícones e labels, adaptativa ao perfil:
  - **Pessoal**: Dashboard, Minha Adega, Wishlist, Estatísticas, Plano
  - **Comercial**: Dashboard, Estoque, Vendas, Cadastros, Relatórios, Plano
- Mobile: bottom navigation ou drawer menu
- Breadcrumbs contextuais

## 8. Tela de Planos & Upgrade
- Página de planos com cards comparativos (sem integração real com Stripe por enquanto)
- Badges de plano atual
- Modal de upgrade elegante com benefícios
- Simulação de trial gratuito de 14 dias

## 9. Banco de Dados (Supabase)
- `profiles` — dados do usuário (nome, avatar, tipo de perfil)
- `user_roles` — roles separados (admin, user, etc.)
- `subscriptions` — plano atual do usuário (mock por enquanto)
- RLS configurado para multi-tenant seguro

## 10. Responsividade
- Design mobile-first em todas as telas
- Tabelas adaptativas (cards no mobile)
- Navegação fluida com transições suaves

