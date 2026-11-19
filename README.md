# 🩺 Simulador OSCE

Aplicativo web para treinar estações de **OSCE** (Exame Clínico Objetivo Estruturado) — prova prática de medicina — com paciente virtual, cronômetro e checklist de avaliação.

Funciona direto no navegador, sem instalação nem servidor: basta abrir o `index.html`.

## Funcionalidades

- **Paciente virtual**: converse digitando ou por voz (🎤, Chrome/Edge). O paciente responde de acordo com o roteiro do caso e pode ler as respostas em voz alta (🔊).
- **Fluxo de prova real**: placa da porta com 1 minuto de leitura → estação cronometrada (aviso aos 2 minutos finais) → fechamento com hipótese diagnóstica e conduta.
- **Exame físico e exames complementares** sob demanda, com resultados na hora.
- **Higienização das mãos** — só pontua se feita antes de examinar.
- **Nota automática pelo checklist**, por seção (comunicação, anamnese, exame físico, exames, diagnóstico e conduta). Condutas inadequadas descontam pontos. Meta de aprovação: 70%.
- **Feedback** com o que faltou, pontos de aprendizado e transcrição completa.
- **Modo dupla**: um colega faz o papel do paciente com o roteiro, os achados e os exames na tela, e marca o checklist durante a estação.
- **Histórico** de desempenho salvo no navegador.

## Estações incluídas

| Estação | Área | Diagnóstico |
|---|---|---|
| Dor torácica na emergência | Clínica Médica · Cardiologia | IAM com supra de ST |
| Dor abdominal aguda | Cirurgia Geral | Apendicite aguda |
| Tosse e febre na idosa | Clínica Médica · Pneumologia | Pneumonia (CURB-65) |
| Diarreia aguda na criança | Pediatria | Desidratação — Plano B |
| Cefaleia na gestante | Ginecologia e Obstetrícia | Pré-eclâmpsia grave |
| Vômitos e mal-estar na jovem | Clínica Médica · Endocrinologia | Cetoacidose diabética |

## Como usar

Abra `index.html` no navegador. O reconhecimento de voz só funciona quando a página é servida por `http(s)`. Nesse caso, use:

```bash
npm start   # serve em http://localhost:8080
```

## Testes

```bash
npm test
```

Os testes simulam um aluno conduzindo cada estação e verificam se as perguntas são reconhecidas, se o checklist é consistente e se uma estação perfeita soma 100%.

## Adicionando uma estação

Os casos ficam em `js/cases.js`. Cada caso tem:

- `falas`: respostas do paciente com palavras-chave (`kw`, sem acento) e o item do checklist que pontuam (`item`);
- `exameFisico` e `exames`: achados e resultados;
- `checklist`: itens de anamnese, exame físico e exames complementares;
- `diagnostico` e `conduta`: opções do fechamento.

Os itens de comunicação (apresentação, identificação, higiene das mãos, explicação e dúvidas) entram automaticamente em todas as estações. Rode `npm test` depois de editar: os testes mostram itens do checklist que não podem ser pontuados.

> Conteúdo educacional para treino. Não substitui protocolos institucionais nem a orientação de preceptores.
