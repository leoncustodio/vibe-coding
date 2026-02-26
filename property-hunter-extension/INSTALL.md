# 🚀 Guia de Instalação Detalhado

## Requisitos

- Google Chrome versão 88 ou superior
- Conta Google
- 15 minutos para configuração inicial

## Parte 1: Configurar API do Google (10 minutos)

### 1.1 Criar Projeto no Google Cloud

1. Acesse https://console.cloud.google.com/
2. No topo da página, clique em "Selecionar Projeto"
3. Clique em "NOVO PROJETO"
4. Nome do projeto: "Property Hunter" (ou outro nome de sua preferência)
5. Clique em "CRIAR"
6. Aguarde alguns segundos até o projeto ser criado

### 1.2 Ativar Google Sheets API

1. No menu lateral, vá em **APIs e serviços** > **Biblioteca**
2. Na barra de busca, digite "Google Sheets API"
3. Clique no resultado "Google Sheets API"
4. Clique no botão **ATIVAR**
5. Aguarde a ativação (geralmente leva alguns segundos)

### 1.3 Configurar Tela de Consentimento OAuth

1. No menu lateral, vá em **APIs e serviços** > **Tela de consentimento OAuth**
2. Selecione **Externo** (ou **Interno** se você tem Google Workspace)
3. Clique em **CRIAR**

4. **Informações do app:**
   - Nome do app: `Property Hunter`
   - E-mail de suporte do usuário: (seu email)
   - Logotipo do app: (opcional, pode pular)

5. **Domínio do app:**
   - Pode deixar em branco

6. **Informações de contato do desenvolvedor:**
   - E-mail: (seu email)

7. Clique em **SALVAR E CONTINUAR**

8. **Escopos:**
   - Clique em **ADICIONAR OU REMOVER ESCOPOS**
   - Na busca, digite "sheets"
   - Marque: `https://www.googleapis.com/auth/spreadsheets`
   - Clique em **ATUALIZAR**
   - Clique em **SALVAR E CONTINUAR**

9. **Usuários de teste** (apenas se escolheu "Externo"):
   - Clique em **+ ADD USERS**
   - Adicione seu email do Google
   - Clique em **ADICIONAR**
   - Clique em **SALVAR E CONTINUAR**

10. Revise e clique em **VOLTAR PARA O PAINEL**

### 1.4 Criar Credenciais OAuth

1. No menu lateral, vá em **APIs e serviços** > **Credenciais**
2. Clique em **+ CRIAR CREDENCIAIS** no topo
3. Selecione **ID do cliente OAuth**

4. **Tipo de aplicativo:**
   - Selecione **Aplicativo para Chrome**

5. **Nome:**
   - Digite: `Property Hunter Extension`

6. **ID do aplicativo:**
   - Por enquanto, deixe em branco (vamos preencher depois)

7. Clique em **CRIAR**

8. Uma janela aparecerá com:
   - **ID do cliente**: Copie este valor e guarde (você vai precisar)
   - Exemplo: `123456789-abcdefg.apps.googleusercontent.com`

9. Clique em **OK**

**IMPORTANTE:** Guarde o Client ID em um lugar seguro! Você vai precisar dele na próxima etapa.

## Parte 2: Instalar a Extensão (5 minutos)

### 2.1 Obter o Código

Opção A - Git (recomendado):
```bash
git clone https://github.com/seu-usuario/property-hunter-extension.git
cd property-hunter-extension
```

Opção B - Download ZIP:
1. Baixe o código como ZIP
2. Extraia em uma pasta de sua escolha
3. Navegue até a pasta extraída

### 2.2 Configurar Client ID

1. Abra o arquivo `manifest.json` em um editor de texto
2. Encontre a seção `oauth2`:
   ```json
   "oauth2": {
     "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
     ...
   }
   ```
3. Substitua `YOUR_CLIENT_ID.apps.googleusercontent.com` pelo Client ID que você copiou na Parte 1.4
4. Salve o arquivo

### 2.3 Carregar Extensão no Chrome

1. Abra o Google Chrome
2. Digite na barra de endereços: `chrome://extensions/`
3. No canto superior direito, ative o **"Modo do desenvolvedor"**
4. Clique no botão **"Carregar sem compactação"**
5. Navegue até a pasta `property-hunter-extension` e selecione-a
6. A extensão será carregada!

### 2.4 Obter ID da Extensão

1. Ainda em `chrome://extensions/`
2. Encontre o card "Rastreador de Imóveis"
3. Copie o **ID** (uma sequência como: `abcdefghijklmnopqrst`)
4. Guarde este ID!

### 2.5 Adicionar ID na Google Cloud Console

1. Volte para https://console.cloud.google.com/
2. Vá em **APIs e serviços** > **Credenciais**
3. Clique no nome da credencial que você criou ("Property Hunter Extension")
4. No campo **ID do aplicativo**, cole o ID da extensão que você copiou
5. Clique em **SALVAR**

## Parte 3: Primeira Configuração (2 minutos)

### 3.1 Conectar ao Google Sheets

1. Clique no ícone da extensão na barra de ferramentas do Chrome
2. Ou vá em: `chrome://extensions/` e clique em "Detalhes" > "Opções da extensão"

3. Clique no botão **"Conectar Google Sheets"**

4. Uma janela do Google OAuth será aberta:
   - Selecione sua conta Google
   - Revise as permissões solicitadas
   - Clique em **Continuar** ou **Permitir**

5. Se você configurou como "Externo" e está em teste:
   - Você verá um aviso "Google hasn't verified this app"
   - Clique em **Advanced** (Avançado)
   - Clique em **Go to Property Hunter (unsafe)** (Ir para Property Hunter - não seguro)
   - Clique em **Continue** (Continuar)

6. Autorize o acesso ao Google Sheets

### 3.2 Configurar Planilha

Opção A - Criar Nova (recomendado):
1. Após conectar, a extensão oferecerá criar uma nova planilha
2. Aceite a sugestão ou escolha um nome personalizado
3. A planilha será criada automaticamente com todos os cabeçalhos

Opção B - Usar Existente:
1. Selecione uma planilha existente da lista
2. **ATENÇÃO:** A extensão vai adicionar dados na aba "Imóveis"
3. Se a aba não existir, ela será criada

### 3.3 Pronto! 🎉

Você está configurado! Agora você pode:

1. Navegar para qualquer site de imóveis suportado
2. Abrir uma página de detalhes de um imóvel
3. Clicar no ícone da extensão
4. Revisar os dados
5. Clicar em "Salvar no Sheets"

## Solução de Problemas

### "Error 401: Unauthorized"
- Sua sessão expirou
- Solução: Vá em Configurações e clique em "Desconectar", depois conecte novamente

### "This extension is not listed in the Chrome Web Store"
- Normal para extensões em desenvolvimento
- Você pode ignorar esse aviso

### "Invalid Client ID"
- Verifique se você copiou o Client ID corretamente no manifest.json
- Verifique se adicionou o ID da extensão no Google Cloud Console

### "Google Sheets API has not been used in project"
- Verifique se você ativou a Google Sheets API na Parte 1.2
- Aguarde alguns minutos e tente novamente (propagação leva tempo)

### Extensão não detecta a página de imóvel
- Verifique se você está em uma página de DETALHES do imóvel (não na lista de resultados)
- Verifique se o site está na lista de suportados
- Tente recarregar a página

### Dados não são extraídos corretamente
- Alguns sites mudam sua estrutura frequentemente
- Reporte o problema com a URL do imóvel para que possamos corrigir

## Apoio

Precisa de ajuda? Abra uma issue no GitHub ou consulte a documentação completa no README.md.

## Próximos Passos

Depois de instalado, confira o README.md para:
- Dicas de uso
- Configurações avançadas
- Atalhos de teclado
- FAQ

**Boa caça de imóveis! 🏠✨**
