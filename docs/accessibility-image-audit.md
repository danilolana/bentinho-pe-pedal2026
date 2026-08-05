# Auditoria de contraste e imagens

## Escopo

Revisão da interface estática do Pé Pedal Bentinho com foco nos critérios
WCAG 2.2 AA de contraste, legibilidade sobre fotografia e desempenho dos
assets do Kartódromo.

## Alterações de contraste

| Uso | Antes | Depois | Resultado |
| --- | --- | --- | --- |
| Texto secundário sobre areia | `#637069` / `#f2ebdd` — 4,37:1 | `#59645d` / `#f2ebdd` — 5,20:1 | AA |
| Texto branco sobre azul-lago | `#ffffff` / `#4f8996` — 3,92:1 | `#ffffff` / `#3f7180` — 5,41:1 | AA |
| Textos na seção verde-clara | `#315c3b` / `#a8c99a` — 4,22:1 | `#203e29` / `#a8c99a` — 6,44:1 | AA |

Também foram removidas opacidades dos textos nos cartões, pois a composição
com o fundo reduzia o contraste efetivo. O hero passou a usar uma camada
verde-escura uniforme sobre a fotografia, evitando que o contraste dependa da
região clara ou escura da imagem.

O foco visível agora combina contorno âmbar e halo branco. Isso mantém o
indicador perceptível tanto sobre fundos claros quanto escuros.

## Tratamento das imagens

As fotos originais foram preservadas como fallback. As versões WebP receberam:

- correção tonal leve (`contrast` entre 1,04 e 1,05);
- saturação discreta (1,03 a 1,04);
- nitidez moderada com `unsharp`, sem alterar elementos da cena;
- compressão WebP em qualidade 76–78;
- variante do hero com 480 px para telas pequenas.

Arquivos gerados:

- `kartodromo-hero.webp`: 800 × 480, aproximadamente 57 KB;
- `kartodromo-hero-mobile.webp`: 480 × 288, aproximadamente 18 KB;
- `kartodromo-contexto.webp`: 900 × 500, aproximadamente 57 KB.

O hero mantém o JPEG original como fallback CSS. A imagem de contexto usa
`picture`, WebP com fallback JPEG, dimensões explícitas para evitar mudança de
layout, `loading="lazy"` e `decoding="async"`. Se os dois formatos falharem, o
JavaScript oculta apenas a figura; o restante do conteúdo continua disponível.

## Implementação

Não há etapa de build. Publique `index.html`, `styles.css`, `app.js` e a pasta
`assets` mantendo a mesma estrutura relativa. Não remova os JPEGs originais,
pois eles atendem navegadores sem suporte ao WebP.

## Roteiro de testes

1. Abrir a página em Chrome, Edge, Firefox e Safari atuais.
2. Conferir o hero em 320, 390, 768, 1024 e 1440 px.
3. Simular rede lenta e confirmar que o conteúdo aparece antes da imagem de
   contexto.
4. Bloquear os arquivos WebP e confirmar o carregamento dos JPEGs.
5. Bloquear também `in.jpg` e confirmar que a figura é removida sem espaço
   vazio ou erro visível.
6. Navegar somente com `Tab`, `Shift+Tab`, `Enter` e setas; conferir o foco em
   fundos claros e escuros.
7. Testar zoom de 200% sem perda de conteúdo ou rolagem horizontal.
8. Revalidar as combinações de cores com axe DevTools, Lighthouse ou Colour
   Contrast Analyser.
9. Testar `prefers-reduced-motion: reduce` e modo de alto contraste do sistema.

## Critério adotado

Texto comum deve atingir pelo menos 4,5:1; texto grande, 3:1; componentes e
indicadores visuais, 3:1 contra cores adjacentes. A validação deve considerar
sempre a cor final renderizada, incluindo transparências e imagens de fundo.
