# 🏠 Rastreador de Imóveis

> Extensão do Chrome para salvar dados de imóveis diretamente no Google Sheets com um único clique!

Uma extensão poderosa e intuitiva que permite que caçadores de imóveis salvem automaticamente informações de propriedades enquanto navegam em sites de imóveis brasileiros.

## ✨ Características

### MVP (Versão 1.0)

- 🎯 **Extração Automática de Dados**: Detecta e extrai automaticamente preço, endereço, características e muito mais
- 📊 **Integração com Google Sheets**: Salva diretamente na sua planilha pessoal via API
- 🔄 **Detecção de Duplicados**: Alerta quando você tenta salvar um imóvel já registrado
- 🎨 **Interface Moderna**: Design playful e intuitivo com animações suaves
- 🇧🇷 **Otimizado para o Brasil**: Suporta formato BRL, CEP, estados brasileiros
- 🏢 **Multi-Site**: Funciona em 6 principais portais de imóveis do Brasil

### Sites Suportados

- ✅ ZAP Imóveis (zapimoveis.com.br)
- ✅ Viva Real (vivareal.com.br)
- ✅ Imovelweb (imovelweb.com.br)
- ✅ OLX Imóveis (olx.com.br/imoveis)
- ✅ QuintoAndar (quintoandar.com.br)
- ✅ Loft (loft.com.br)

## 📦 Instalação

### Pré-requisitos

1. **Google Chrome** (versão 88 ou superior)
2. **Conta Google** para acessar o Google Sheets
3. **Credenciais da API do Google** (instruções abaixo)

### Passo 1: Configurar Credenciais da Google API

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Ative a **Google Sheets API**:
   - Vá para "APIs & Services" > "Library"
   - Procure por "Google Sheets API"
   - Clique em "Enable"
4. Crie credenciais OAuth 2.0:
   - Vá para "APIs & Services" > "Credentials"
   - Clique em "Create Credentials" > "OAuth client ID"
   - Selecione "Chrome Extension" como tipo de aplicação
   - Adicione o ID da extensão (você obterá isso após instalar)
5. Configure a tela de consentimento OAuth:
   - Vá para "OAuth consent screen"
   - Escolha "External" (ou "Internal" se for G Suite)
   - Preencha as informações necessárias
   - Adicione o escopo: `https://www.googleapis.com/auth/spreadsheets`

### Passo 2: Instalar a Extensão

1. Clone ou baixe este repositório:
   ```bash
   git clone https://github.com/seu-usuario/property-hunter-extension.git
   cd property-hunter-extension
   ```

2. Atualize o `manifest.json` com seu Client ID:
   ```json
   "oauth2": {
     "client_id": "SEU_CLIENT_ID_AQUI.apps.googleusercontent.com",
     "scopes": [
       "https://www.googleapis.com/auth/spreadsheets"
     ]
   }
   ```

3. Abra o Chrome e vá para `chrome://extensions/`

4. Ative o "Modo do desenvolvedor" no canto superior direito

5. Clique em "Carregar sem compactação"

6. Selecione a pasta `property-hunter-extension`

7. A extensão será instalada e aparecerá na barra de ferramentas!

### Passo 3: Configuração Inicial

1. Clique no ícone da extensão (ou pressione Alt+P)
2. Na primeira vez, você será redirecionado para a página de configurações
3. Clique em "Conectar Google Sheets"
4. Autorize a extensão a acessar suas planilhas
5. Escolha uma planilha existente ou crie uma nova
6. Pronto! Você está configurado ✨

## 🚀 Como Usar

### Salvando um Imóvel

1. **Navegue** até qualquer página de detalhes de imóvel em um dos sites suportados
2. O ícone da extensão mostrará um **✓** verde indicando que detectou um imóvel
3. **Clique** no ícone da extensão
4. **Revise** os dados extraídos (você pode editar qualquer campo)
5. **Adicione** observações ou tags se desejar
6. Clique em **"Salvar no Sheets"**
7. **Pronto!** Os dados foram salvos na sua planilha

### Dados Extraídos

A extensão extrai automaticamente:

- 📅 Data de salvamento
- 🔗 URL do anúncio
- 📍 Endereço completo
- 🏘️ Bairro, Cidade, Estado, CEP
- 💰 Preço
- 🏠 Número de quartos e banheiros
- 📐 Área em m²
- 🏢 Tipo de imóvel (apartamento, casa, etc.)
- 💵 Valor do condomínio
- 🏛️ IPTU
- 📝 Campo para observações pessoais
- 🏷️ Tags personalizadas
- ✅ Status do imóvel

### Estrutura da Planilha

A planilha criada automaticamente terá as seguintes colunas:

| Data | URL | Endereço | Bairro | Cidade | Estado | CEP | Preço | Quartos | Banheiros | Área (m²) | Tipo | Condomínio | IPTU | Ano | Observações | Tags | Status |
|------|-----|----------|--------|--------|--------|-----|-------|---------|-----------|-----------|------|------------|------|-----|-------------|------|--------|

## ⚙️ Configurações

Acesse as configurações clicando com o botão direito no ícone da extensão e selecionando "Opções".

### Preferências Disponíveis

- **Fechar automaticamente após salvar**: O popup fecha automaticamente após salvar com sucesso
- **Mostrar avisos de duplicados**: Alerta quando você tenta salvar um imóvel já salvo
- **Status padrão**: Status inicial para novos imóveis (Interessado, Contatado, etc.)

## 🛠️ Desenvolvimento

### Estrutura do Projeto

```
property-hunter-extension/
├── manifest.json                 # Configuração da extensão
├── popup/
│   ├── popup.html               # Interface do popup
│   ├── popup.css                # Estilos (design playful)
│   └── popup.js                 # Lógica do popup
├── content-scripts/
│   ├── common-extractor.js      # Lógica comum de extração
│   ├── zapimoveis-extractor.js  # Extrator para ZAP Imóveis
│   ├── vivareal-extractor.js    # Extrator para Viva Real
│   ├── imovelweb-extractor.js   # Extrator para Imovelweb
│   ├── olx-extractor.js         # Extrator para OLX
│   ├── quintoandar-extractor.js # Extrator para QuintoAndar
│   └── loft-extractor.js        # Extrator para Loft
├── background/
│   └── service-worker.js        # Service worker (Manifest V3)
├── options/
│   ├── settings.html            # Página de configurações
│   ├── settings.css             # Estilos das configurações
│   └── settings.js              # Lógica das configurações
├── lib/
│   ├── google-sheets-api.js     # API do Google Sheets
│   ├── storage-manager.js       # Gerenciamento de storage
│   └── property-parser.js       # Utilitários de parsing
└── assets/
    └── icons/                    # Ícones da extensão
```

### Tecnologias Utilizadas

- **Manifest V3** - Última versão do Chrome Extensions
- **Vanilla JavaScript (ES6+)** - Sem frameworks, performance máxima
- **Google Sheets API v4** - Integração direta com planilhas
- **Chrome Identity API** - OAuth 2.0 para autenticação
- **Chrome Storage API** - Armazenamento de configurações

### Scripts de Desenvolvimento

```bash
# Recarregar extensão após mudanças
# Vá para chrome://extensions/ e clique no botão de reload

# Visualizar logs
# Popup: Clique com botão direito > Inspecionar
# Background: chrome://extensions/ > Detalhes > Exibir visualizações > service worker

# Testar em sites
# Abra qualquer página de imóvel nos sites suportados
```

## 🐛 Problemas Conhecidos

- **Ícones**: A versão atual usa ícones placeholder. Ícones customizados serão adicionados em breve.
- **Extratores OLX/Loft**: Podem precisar de ajustes finos dependendo das mudanças no site.
- **Rate Limiting**: A API do Google Sheets tem limites. A extensão detecta e coloca em fila offline se necessário.

## 📝 TODO / Roadmap

### Versão 1.1 (Próximas Melhorias)
- [ ] Adicionar ícones customizados
- [ ] Melhorar extratores de OLX e Loft
- [ ] Adicionar testes automatizados
- [ ] Otimizar extração para páginas muito dinâmicas
- [ ] Adicionar opção de editar imóveis salvos

### Versão 2.0 (Futuro)
- [ ] Salvar múltiplos imóveis de uma vez (bulk save)
- [ ] Monitoramento de mudanças de preço
- [ ] Comparação lado a lado de imóveis
- [ ] Exportar para CSV/Excel
- [ ] Modo escuro
- [ ] Atalhos de teclado customizáveis
- [ ] Campos personalizados
- [ ] Sincronização entre dispositivos

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para:

1. Fazer um fork do projeto
2. Criar uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abrir um Pull Request

### Diretrizes

- Mantenha o design playful e intuitivo
- Siga os padrões de código existentes
- Teste em todos os sites suportados
- Adicione comentários para lógica complexa
- Atualize a documentação se necessário

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 🙏 Agradecimentos

- OpenAI pela API que ajudou no desenvolvimento
- Comunidade do Chrome Extensions
- Todos os caçadores de imóveis que deram feedback

## 📧 Contato

Tem dúvidas ou sugestões? Abra uma [issue](https://github.com/seu-usuario/property-hunter-extension/issues) no GitHub!

---

**Feito com 💜 para caçadores de imóveis brasileiros**

✨ Boa caça! 🏠
