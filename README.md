# Pé Pedal Bentinho — perguntas em movimento

Site estático e responsivo para uma escuta pública durante o Pé Pedal
Bentinho 2026, no Kartódromo Municipal Afrânio Ferreira Júnior. A experiência
apresenta a história do circuito e cinco perguntas sobre movimento, saúde e
convivência nesse espaço.

## Premissas

- O site será aberto em navegador moderno, por celular, tablet, computador ou
  totem.
- Esta primeira versão não possui servidor ou banco de dados.
- As respostas são anônimas e ficam somente no `localStorage` do navegador.
  Portanto, não são compartilhadas entre dispositivos nem enviadas à escola.
- O nome e a foto usados no certificado ficam apenas na memória da página,
  não entram no `localStorage` e não são enviados a um servidor.
- O acesso à câmera exige HTTPS ou `localhost`. Quando ele não está disponível,
  a pessoa pode usar a opção de foto do aparelho.
- O conteúdo foi elaborado a partir de `docs/concept.txt`.
- Textos de resposta não aceitam links, e-mails ou telefones, reduzindo o risco
  de coleta acidental de dados pessoais.

## Dependências

Não há bibliotecas, frameworks, processo de build ou instalação de pacotes. São
usados HTML5, CSS3 e JavaScript nativo. As famílias Manrope, Inter e Lora são
carregadas pelo Google Fonts; sem conexão, o site usa as fontes de sistema
definidas como fallback.

## Estrutura

- `index.html`: conteúdo semântico, formulário, janela de câmera, certificado,
  mapa vetorial e regiões acessíveis.
- `styles.css`: identidade visual, estados dos controles, câmera, certificado,
  animações e responsividade.
- `app.js`: configuração das perguntas, navegação, validação, persistência,
  câmera, geração local do certificado e interação com o circuito.
- `assets/kartodromo/`: imagens do circuito usadas no hero e no bloco histórico.
- `docs/accessibility-image-audit.md`: razões de contraste, tratamento dos
  assets e roteiro de validação.
- `docs/concept.txt`: documentação conceitual fornecida.

As perguntas ficam no array `questions`, no início de `app.js`. Novas perguntas
devem seguir um dos tipos já suportados: `radio`, `checkbox`, `range` ou
`textarea`.

## Decisões de implementação

- Fluxo de uma pergunta por vez para reduzir carga cognitiva em ambiente
  público.
- Identidade de natureza urbana baseada em verde-folha, azul-lago, terracota e
  areia, com formas curvas inspiradas nos caminhos e na água.
- Barra de progresso e retorno à pergunta anterior sem perda das respostas.
- Mapa autoral do traçado com camadas de pista, movimento e memória; o marcador
  segue o ponto mais próximo do cursor, responde a toque e pode ser conduzido
  pelo teclado.
- Após a última resposta, a câmera frontal é solicitada para uma foto de
  chegada. O certificado é desenhado em Canvas com nome e foto, podendo ser
  impresso, baixado em PNG ou compartilhado pela API nativa do aparelho.
- Validação em cada etapa, com mensagens específicas e foco levado ao campo
  problemático.
- Resumo final criado com `textContent`, evitando injeção de HTML por entradas
  do usuário.
- Persistência protegida por `try/catch`, pois o navegador pode bloquear
  `localStorage`.
- HTML semântico, `fieldset`/`legend`, região de erro com `role="alert"`,
  indicador de progresso e foco visível.
- Animações respeitam `prefers-reduced-motion`.
- Cores de texto atendem ao contraste mínimo WCAG 2.2 AA nos fundos definidos.
- Imagens WebP possuem fallback JPEG, dimensões explícitas e carregamento
  adiado fora da primeira dobra.

## Como executar

Opção simples: abra `index.html` diretamente no navegador.

Para simular um ambiente web local, na pasta do projeto execute um servidor
estático de sua preferência. Por exemplo, se Python já estiver instalado:

```powershell
python -m http.server 8080
```

Depois acesse `http://localhost:8080`.

## Roteiro de testes

1. Abra o site e use “Ir para as perguntas” com a tecla `Tab`.
2. Na primeira pergunta, tente continuar sem escolher uma opção. A mensagem de
   erro deve aparecer e o foco deve ir ao primeiro controle.
3. Volte e avance entre perguntas. As escolhas devem permanecer marcadas.
4. Na pergunta de múltipla escolha, tente marcar quatro itens. O quarto deve ser
   desmarcado e uma mensagem deve explicar o limite de três.
5. Mova o controle de disposição de 1 a 5 usando mouse e setas do teclado.
6. Na resposta aberta, teste menos de 10 caracteres, mais de 280 caracteres,
   um link, um e-mail e um telefone. Cada entrada inválida deve ser bloqueada.
7. Conclua o fluxo. O resumo deve exibir as cinco respostas sem interpretar
   texto como HTML.
8. Recarregue a página. As respostas anteriores devem continuar disponíveis.
9. Clique em “Recomeçar”, confirme a ação e verifique se os dados foram
   apagados.
10. Teste larguras de 320 px, 768 px e 1440 px, navegação somente por teclado e
    preferência do sistema por movimento reduzido.
11. Conclua o questionário em HTTPS ou `localhost`, autorize a câmera, capture e
    refaça a foto, preencha o nome e confirme a presença do rosto.
12. Gere o certificado e teste impressão, download e compartilhamento. Bloqueie
    a câmera para validar a mensagem de erro e a alternativa de foto do aparelho.

## Riscos e próximos ajustes

- Para consolidar respostas de vários visitantes, será necessária uma API com
  autenticação administrativa, rate limit, moderação e banco de dados. Não use
  `localStorage` como fonte de pesquisa coletiva.
- Totens compartilhados exigem limpeza automática após cada participação e
  modo quiosque no navegador.
- A validação atual evita dados pessoais comuns, mas não substitui moderação de
  conteúdo se as respostas forem publicadas.
- Antes de produção, validar textos, identidade visual e política de
  privacidade com a Escola Técnica Bento Quirino.
- Se houver publicação de resultados, apresentar contagens reais e nunca
  métricas simuladas.
