# OSCE Immersive — hospital virtual para treino de OSCE

Simulador de estações OSCE em primeira pessoa. Você entra em uma sala clínica 3D, conversa com um paciente virtual por voz ou texto, examina com escolha de técnica, pede exames, registra hipóteses e conduta e recebe uma avaliação por checklist com relatório e painel de desempenho.

Funciona no navegador do computador e do iPad, sem headset. Os dados ficam no próprio navegador.

> Ferramenta de estudo. As notas são estimativas do simulador a partir de evidências registradas e **não equivalem à avaliação de professores**. Os casos incluídos são **demonstrativos** e não são estações oficiais da Afya.

## Capturas

| | |
|---|---|
| ![Início](docs/capturas/01-inicio.png) | ![Enunciado da estação](docs/capturas/02-enunciado.png) |
| ![Atendimento com conversa](docs/capturas/03-atendimento.png) | ![Prova dos braços estendidos: queda do braço esquerdo, olhos fechados](docs/capturas/04-prova-bracos.png) |
| ![Exame físico com escolha de técnica](docs/capturas/05-exame-fisico.png) | |

As capturas foram feitas em um servidor sem GPU (renderização por software); em um iPad ou computador comum a cena roda com fluidez.

## Como rodar

```bash
npm install
npm run dev          # http://localhost:3000
# produção
npm run build && npm start
```

Para usar no iPad: rode o servidor no computador e abra `http://<ip-do-computador>:3000` no Safari do iPad (mesma rede). O microfone do Safari exige HTTPS fora de `localhost`; para isso, publique em um serviço com HTTPS (ex.: Vercel) ou use um túnel HTTPS. Em "Compartilhar → Adicionar à Tela de Início" o app abre em tela cheia.

### IA conversacional (opcional)

Sem configuração, o paciente responde pela **ficha estruturada do caso** (modo determinístico, funciona offline). Para respostas mais naturais:

```bash
export ANTHROPIC_API_KEY=...   # no servidor
# opcional: OSCE_MODELO_IA (padrão claude-opus-5-5)
```

Depois ative em **Configurações → IA conversacional**. A IA recebe somente a ficha do caso, deve citar quais fatos revelou e não pode inventar dados. O fallback do lado do servidor (`fallbacks: "default"`) refaz a chamada em outro modelo se houver recusa. Se a IA falhar, a resposta vem da ficha.

## Desempenho no iPad

- **Qualidade gráfica** (Configurações): Alta, Equilibrada (padrão) ou Economia de bateria — reduz a resolução de renderização.
- Com **Reduzir movimento** ativo no sistema (Ajustes → Acessibilidade → Movimento), a cena é renderizada sob demanda (poucos quadros por segundo) e a câmera troca de ponto de vista sem transição.
- A resolução também cai automaticamente se a taxa de quadros despencar.

## Testes

```bash
npm test             # motor: conversa, avaliação, erros críticos, evolução clínica (vitest)
npm run test:e2e     # navegador: estação de AVC completa, emergência, ferida, configurações (Playwright)
                     # perfis "computador" (1366×820) e "ipad" (1180×820 com toque, no Chromium)
npm run lint
```

## O que existe nesta versão (Fase 1)

| Recurso | Situação |
|---|---|
| Sala 3D navegável (pronto atendimento, sala de procedimentos; consultório, emergência e enfermaria como variações da mesma sala) | Implementado |
| Paciente 3D animado | Implementado (avatar procedural — ver limitações) |
| **39 estações** — pelo menos uma para cada um dos 32 assuntos de HAM 5 Práticas (tabela abaixo), com filtro N1/N2/N3 | Implementado |
| **Simulado de prova** — sorteia 3 clínicas + 3 cirúrgicas do nível e soma na escala de 55 pontos | Implementado |
| Conversa por texto e voz, transcrição, repetir pergunta, controle de microfone | Implementado (voz depende do navegador) |
| Exame físico com escolha de **técnica** e avaliação da **sequência** | Implementado |
| Modos Aprendizado, OSCE e Emergência (AVC e crise convulsiva com evolução no tempo) | Implementados |
| Checklist com origem da evidência, erros críticos, revisão manual com justificativa e histórico | Implementado |
| Relatório com sequência ideal, explicações, macetes, plano de revisão, "Refazer" e "Treinar apenas meus erros", exportação PDF | Implementado |
| Painel: radar de competências, evolução, tema, mapa de erros, gestão de tempo, meta 31,4/55, histórico | Implementado (apenas dados reais) |
| Biblioteca de casos: ficha com 14 seções e referências, revisão de conteúdo, edição/importação/exportação em JSON | Implementado |
| Configurações: pontuação total, meta, nº de estações, valor e tempo por estação, política de erro crítico, qualidade gráfica, tema claro/escuro | Implementado |
| Realidade virtual (WebXR) | **Não implementado** — Fase 3 |

## Estações incluídas

São 39 estações, organizadas pela lista de assuntos do 5º período (HAM 5 Práticas). Cada assunto dos dois blocos tem pelo menos uma estação, e cada cartão mostra o número do assunto. Os níveis seguem a lista: **N1** = assuntos 01 a 07, **N2** = 01 a 12 (inclui a N1), **N3** = 13 a 16.

Os roteiros seguem o resumo de OSCE HAM V do aluno e as diretrizes citadas na ficha de cada caso. São casos demonstrativos, não estações oficiais da Afya, e ficam marcados como **rascunho** até a revisão de um docente.

### Bloco 1 — Clínica

| Nº | Assunto | Nível | Estação(ões) |
|---|---|---|---|
| 01 | Entrevista em Saúde Mental | N1, N2 | Vozes que ninguém mais ouve |
| 02 | Segurança do Paciente | N1, N2 | Queda na enfermaria |
| 03 | Exame do Paciente com Dor | N1, N2 | Dor lombar irradiada para a perna; Dor no pescoço que desce para o braço |
| 04 | Exame do Paciente com Artropatia | N1, N2 | Joelho inchado após torção no futebol; Dor súbita no dedão do pé; Estalo na panturrilha durante o jogo; Dor no cotovelo ao segurar objetos |
| 05 | Exame do Ombro no Idoso | N1, N2 | Dor no ombro para pentear o cabelo |
| 06 | Manejo de Desordens Neurológicas Não Orgânicas | N1, N2 | Fraqueza na perna após um susto |
| 07 | Avaliação do Quadro Neurológico Isquêmico Agudo | N1, N2 | Déficit neurológico súbito no pronto atendimento (modo emergência) |
| 08 | Manejo do Paciente Agitado e Agressivo | N2 | Paciente agitado no pronto atendimento |
| 09 | Avaliação da Crise Epiléptica no Pronto Atendimento | N2 | Crise convulsiva na sala de emergência (modo emergência) |
| 10 | Síndrome Extrapiramidal (Parkinson) e Cuidados Paliativos | N2 | Tremor e lentidão no idoso |
| 11 | Manejo do Paciente com Tendência Suicida | N2 | Tristeza e desesperança |
| 12 | Coleta de Líquor em Paciente com Encefalopatia | N2 | Confusão e febre: coleta de líquor; Febre, cefaleia e rigidez de nuca |
| 13 | Técnica de Otoscopia e Interpretação | N3 | Dor de ouvido depois do resfriado; Tontura ao virar na cama |
| 14 | Avaliação do Paciente Diabético no Pronto Atendimento | N3 | Diabético com vômitos e respiração rápida; Visão embaçada no diabético |
| 15 | Avaliação do Paciente com Distúrbio Tireoidiano | N3 | Cansaço, frio e ganho de peso |
| 16 | Distúrbios Hipotálamo-Hipofisários e Automedicação | N3 | Ganho de peso após 'remédio para dor' |

### Bloco 2 — Cirúrgica

| Nº | Assunto | Nível | Estação(ões) |
|---|---|---|---|
| 01 | NR 32 e Normas de Biossegurança | N1, N2 | Picada de agulha na enfermaria |
| 02 | Escovação, Paramentação e Desparamentação | N1, N2 | Escovação e paramentação cirúrgica |
| 03 | Antissepsia e Campos Cirúrgicos | N1, N2 | Preparo do campo operatório |
| 04 | Instrumentação Cirúrgica | N1, N2 | Montagem da mesa de instrumentação |
| 05 | Técnica de Anestesia Local | N1, N2 | Anestesia local para retirada de lipoma |
| 06 | Manuseio de Instrumental e Sutura Interrompida | N1, N2 | Ferida no antebraço: avaliação, assepsia e sutura |
| 07 | Sutura Contínua | N1, N2 | Fechamento de pele com sutura contínua |
| 08 | Modalidades de Hemostasia | N2 | Ferida sangrante no couro cabeludo |
| 09 | Cuidados com Ferida Pós-operatória | N2 | Ferida operatória com secreção |
| 10 | Manejo da Via Aérea e Intubação Orotraqueal | N2 | Rebaixamento de consciência na sala vermelha |
| 11 | Cuidados com Lesões por Pressão | N2 | Lesão sacral em paciente acamada |
| 12 | Punção Venosa Periférica e Coleta de Sangue | N2 | Coleta de sangue venoso |
| 13 | Tratamento do Abscesso Cutâneo | N3 | Nódulo doloroso na coxa |
| 14 | Manejo da Dor Pós-operatória | N3 | Dor no primeiro dia de pós-operatório |
| 15 | Protocolo de Cirurgia Segura | N3 | Lista de verificação na sala operatória |
| 16 | TCLE e Revisão de Procedimentos | N3 | Consentimento para colecistectomia |

## Simulado de prova

Na tela inicial (ou no menu **Simulado**), escolha N1, N2 ou N3. O app sorteia 3 estações clínicas e 3 cirúrgicas de assuntos diferentes dentro do nível. Todas rodam no modo OSCE, uma depois da outra. Depois de cada estação, o relatório mostra o placar parcial e o botão **Próxima estação**. No fim, a página do simulado soma os pontos na escala da prova (55 pontos por padrão) e compara com a meta (31,4). Sem checklist oficial, cada estação vale 55 ÷ 6, e a tela avisa que esse valor é uma suposição. O valor de cada estação pode ser ajustado em Configurações.

## Transparência: o que é 3D, o que é externo e o que é simplificado

### Realmente tridimensional e interativo
- Sala, mobiliário e equipamentos são geometria 3D renderizada em tempo real (Three.js / React Three Fiber). Pia, esfigmomanômetro, oxímetro, termômetro, glicosímetro, lanterna, martelo, estetoscópio, bandeja e monitor são **clicáveis/tocáveis** e abrem as manobras correspondentes.
- Câmera em primeira pessoa: pontos de vista por toque, arrastar para olhar, WASD/setas no computador.
- O paciente respira na frequência respiratória do caso, mantém contato visual intercalado com desvios do olhar, pisca em intervalos irregulares, tem micro-movimentos de cabeça, expressão de ansiedade e de dor (em manobras dolorosas) e movimenta a mandíbula ao falar.
- Achados representados no corpo 3D: **tremor de repouso** (Parkinson), **face em máscara**, **sonolência pós-ictal**, **paresia facial** (comissura labial e sorriso assimétrico), **queda do braço** na prova dos braços estendidos, **queda da perna**, **pupilas** que contraem à luz da lanterna (reflexo direto e consensual), **seguimento ocular** em "H", **ferida** no antebraço (coberta por gaze até a inspeção) e respiração.
- Monitor multiparamétrico com traçado de ECG desenhado em tempo real (irregular na fibrilação atrial) e relógio de parede (hora clínica no modo emergência).

### Simplificações didáticas (declaradas na interface)
- **Avatar procedural**: o paciente é montado com formas geométricas geradas em código. Não é fotorrealista e não usa modelo 3D externo. Não usamos fotos nem imagens fingindo ser personagens 3D.
- **Sincronização labial aproximada**: a boca abre no ritmo das palavras emitidas pela síntese de voz (eventos de palavra), não por fonemas.
- A prova das pernas é mostrada com o paciente **sentado** (adaptação visual da Mingazzini, que é feita deitado).
- Achados sem representação visual fiel (força, reflexos, sensibilidade, ausculta, campos visuais, linguagem, etc.) aparecem como **"achado estruturado"**, identificados na tela, em vez de uma animação enganosa. Os achados com representação 3D recebem o selo **"3D"**.
- O modo emergência usa um **relógio clínico** determinado por regras do caso: o tempo real corre, perguntas e manobras custam minutos, exames de imagem levam o paciente (o relógio avança) e exames laboratoriais ficam prontos após o prazo. Sinais vitais seguem a curva definida no caso e mudam conforme as decisões (ex.: anti-hipertensivo reduz a PA após 10 min). Nada é sorteado.
- O tempo por etapa é estimado pelo intervalo entre as ações registradas.

### Depende de serviços/recursos externos
- **Reconhecimento de voz** e **voz do paciente** usam a Web Speech API do navegador. Chrome e Edge reconhecem fala; no Safari/iPadOS o suporte existe mas varia por versão; o Firefox não reconhece fala. Sem suporte, o botão de microfone fica desativado e a conversa é por texto. A qualidade da voz depende das vozes pt-BR instaladas no aparelho.
- **IA conversacional** é opcional e exige `ANTHROPIC_API_KEY` no servidor.

## Como a avaliação funciona

Cada item do checklist tem um critério verificável e mostra a **origem da evidência**:

| Origem | Exemplo | Pontua automaticamente? |
|---|---|---|
| Ação na tela | manobra com técnica correta, exame pedido, decisão registrada | Sim |
| Fala verificada | regra determinística reconheceu a pergunta/fala do aluno | Sim |
| Interpretação de IA | fato revelado só pela IA opcional | **Não** — aguarda revisão |
| Avaliação humana | empatia, postura | **Não** — aguarda revisão |

- Manobra com técnica inadequada **não conta** como realizada.
- Itens de sequência (ex.: higienizar as mãos antes de tocar o paciente; glicemia antes da decisão) verificam a ordem real.
- Erros críticos são regras do caso (ex.: trombólise sem TC, antiagregante antes da imagem, anestesiar antes de testar a sensibilidade). A política "zerar a estação" é configurável.
- Revisão manual exige justificativa e fica registrada no histórico da tentativa.

### Pontuação da prova
A prova é configurável (padrão HAM V: 6 estações — 3 clínicas e 3 cirúrgicas —, 55 pontos, meta 31,4). Como a distribuição oficial de pontos por estação não é conhecida, o simulador **não presume**: sem valor informado, a projeção usa a divisão igual e é marcada como suposição. Informe os valores reais em Configurações.

### Limites da verificação
- Os testes de navegador rodam no **Chromium** com tela do tamanho de um iPad e toque. O **Safari/WebKit real do iPad não estava disponível** no ambiente de desenvolvimento: teste no aparelho antes de uma sessão importante (principalmente o microfone).
- O ambiente de testes não tem GPU; os testes usam o modo de movimento reduzido para manter a página responsiva.

## Formato dos casos (importação)

Baixe o modelo em **Casos → Baixar modelo** (é o caso de AVC completo). O schema está em `src/lib/caso/schema.ts`; a importação valida o arquivo e confere se todos os ids citados no checklist e nas regras existem. Principais blocos:

- `paciente` (falas fixas, respostas para o que não está na ficha, limitações) e `fatos` (o que o paciente sabe; cada fato só é revelado por perguntas que contenham seus `gatilhos`);
- `manobras` (sistema, técnicas certas/erradas, achado, `visual` opcional) e `exames` (resultado, tempo no modo emergência);
- `decisoes` (hipótese, diferenciais, janela, conduta, orientações), `checklist` e `errosCriticos`;
- `evolucao` (curva de sinais vitais, efeitos de decisões, eventos por tempo e metas) para o modo emergência;
- `ficha` (14 seções didáticas, sequência ideal, macetes e referências) e `revisao` (status de revisão do conteúdo).

## Arquitetura

- **Next.js 16 (App Router) + TypeScript + Tailwind CSS 4**
- **React Three Fiber + Drei + Three.js** — `src/components/three`
- **Recharts** — `src/components/graficos`
- **Motor sem dependência de interface** — `src/lib/engine` (conversa, sessão/registro de eventos, avaliação, evolução clínica, relatório), testado com Vitest
- **Persistência local** — `localStorage` (`src/lib/store`), com exportação de backup
- **IA opcional** — `src/app/api/paciente/route.ts` (SDK oficial da Anthropic, saída estruturada validada)

A versão anterior (HTML estático) continua disponível em `/v1/index.html`.

### Versão de página única (celular, sem servidor)
`npm run build:artefato` gera `dist-artefato/index.html` + `app.js`, com o mesmo código e um roteador em memória no lugar do roteador do Next.js. É a versão publicada como página do claude.ai. Nela:
- o ditado de voz usa o recurso de ditado do claude.ai (Chrome e app desktop); no app do celular e no Safari, digite ou use o microfone do teclado do sistema;
- a voz do paciente usa a síntese de voz do navegador;
- "Exportar PDF" não aparece (a impressão é bloqueada); backups e casos são salvos pelo recurso de download do claude.ai;
- a IA conversacional opcional não está disponível (não há servidor);
- os dados ficam no navegador de cada aparelho.

## Referências clínicas dos casos

Listadas na ficha de cada caso e no relatório (AHA/ASA 2019, Linha de Cuidado do AVC do Ministério da Saúde, diretriz brasileira de trombólise, NIHSS; Manual de Normas e Procedimentos para Vacinação do MS, ANVISA, NR-32, AFP). O conteúdo está marcado como **rascunho** até revisão por docente; o status pode ser atualizado na biblioteca de casos.

## Roteiro

- **Fase 2**: casos de cefaleia, delirium e instrumentais cirúrgicos, sala de emergência própria, mais exames, importação de PDFs/roteiros, sincronização em nuvem.
- **Fase 3**: modelos 3D licenciados com morph targets faciais (sincronização labial por visemas), animações clínicas específicas (marcha, crise), interação com objetos 3D (pegar o estetoscópio), WebXR para headsets, cenários dinâmicos.
