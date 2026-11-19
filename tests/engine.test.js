// Executar com: node --test tests/
const test = require('node:test');
const assert = require('node:assert');
const OSCE = require('../js/engine.js');
const CASOS = require('../js/cases.js');

const caso = (id) => CASOS.find((c) => c.id === id);

// Roteiro de um "bom aluno" para cada estação, escrito como um estudante falaria.
const ROTEIROS = {
  'dor-toracica': [
    'Bom dia, meu nome é Ana, sou a médica plantonista.', 'Qual o seu nome completo?',
    'Onde é a dor?', 'Quando começou?', 'Como é essa dor?', 'De 0 a 10, qual a nota da dor?',
    'A dor irradia para algum lugar?', 'Alguma coisa melhora ou piora a dor?',
    'Está suando, com náusea?', 'Tem falta de ar?', 'Já sentiu essa dor antes?',
    'O senhor tem pressão alta, diabetes ou colesterol?', 'O senhor fuma?', 'Alguém na família teve infarto?',
    'Toma algum remédio?', 'Tem alergia a algum medicamento?', 'Já teve sangramento, AVC ou cirurgia recente?',
    'Vou explicar o diagnóstico: o senhor está tendo um infarto.', 'Ficou alguma dúvida?'
  ],
  apendicite: [
    'Boa tarde, me chamo Pedro, sou o médico.', 'Como o senhor se chama?', 'Há quanto tempo começou a dor?',
    'Onde dói agora?', 'Onde a dor começou?', 'Como é a dor?', 'O que melhora ou piora?', 'Teve náusea ou vômito?',
    'Teve febre?', 'Como está o intestino, evacuou?', 'Alguma ardência para urinar?', 'Quando foi a sua última refeição?',
    'Tem alguma doença?', 'Já fez alguma cirurgia?', 'Tem alergia?', 'Está com fome?',
    'Provavelmente é uma apendicite, você precisa de cirurgia.', 'Tem alguma dúvida?'
  ],
  pneumonia: [
    'Bom dia, sou a doutora Júlia.', 'Qual é o nome da senhora?', 'Desde quando está assim?', 'A tosse tem catarro?',
    'Teve sangue no catarro?', 'Teve febre?', 'Sente falta de ar?', 'Sente dor no peito?', 'A senhora está confusa?',
    'Perdeu peso ou tem suor noturno?', 'A senhora tem alguma doença?', 'Tomou antibiótico nos últimos meses?',
    'Fuma?', 'Tomou vacina da gripe?', 'Tem alergia?', 'A senhora tem uma pneumonia e vamos internar.', 'Alguma dúvida?'
  ],
  'diarreia-pediatria': [
    'Bom dia, sou o doutor Rafael.', 'Qual o nome da senhora e da criança?', 'Há quanto tempo começou a diarreia?',
    'Quantas vezes por dia ele evacua?', 'Tem sangue nas fezes?', 'Ele vomitou?', 'Teve febre?', 'Como está o xixi?',
    'Ele está com sede?', 'Está mamando, se alimentando?', 'Teve convulsão ou ficou muito sonolento?',
    'Alguém na creche com diarreia?', 'As vacinas estão em dia?', 'Ele tem alguma doença ou já ficou internado?',
    'O diagnóstico é diarreia com desidratação, vamos iniciar o soro.', 'Ficou alguma dúvida?'
  ],
  'pre-eclampsia': [
    'Boa noite, eu sou a médica Laura.', 'Qual o seu nome?', 'Está de quantas semanas?', 'Como foi o pré-natal?',
    'Como é a dor de cabeça?', 'Alguma alteração na visão?', 'Tem dor na boca do estômago?', 'O bebê está mexendo?',
    'Perdeu líquido ou sangue?', 'Tinha pressão alta antes da gravidez?', 'Tem alergia?',
    'A senhora tem pré-eclâmpsia e vamos precisar fazer o parto.', 'Tem alguma dúvida?'
  ],
  cetoacidose: [
    'Olá, sou o estudante Marcos.', 'Qual seu nome?', 'Quando começou?', 'Quantas vezes vomitou?', 'Onde é a dor na barriga?',
    'Está urinando muito?', 'Tem sentido muita sede?', 'Perdeu peso?', 'Está com muita fome?', 'Teve febre ou infecção?',
    'Você tem diabetes?', 'Alguém na família tem diabetes?', 'Quando foi a última menstruação?', 'Toma algum remédio?',
    'Tem alergia?', 'O diagnóstico é cetoacidose diabética.', 'Ficou com dúvida?'
  ]
};

for (const c of CASOS) {
  test(`roteiro completo marca toda a anamnese: ${c.id}`, () => {
    const s = new OSCE.Sessao(c);
    for (const p of ROTEIROS[c.id]) s.perguntar(p);
    const faltando = c.checklist.anamnese.filter((i) => !s.marcados[i.id]).map((i) => i.id);
    assert.deepStrictEqual(faltando, [], 'itens não marcados: ' + faltando.join(', '));
    for (const id of ['apresentacao', 'identificacao', 'explica', 'duvidas']) {
      assert.ok(s.marcados[id], c.id + ': comunicação não marcada: ' + id);
    }
  });

  test(`integridade dos dados: ${c.id}`, () => {
    OSCE.prepararCaso(c);
    const ids = new Set(c.itens.map((i) => i.id));
    const refs = [...c.falas, ...c.exameFisico, ...c.exames].filter((x) => x.item).map((x) => x.item);
    for (const r of refs) assert.ok(ids.has(r), `${c.id}: item inexistente no checklist: ${r}`);
    const alcancaveis = new Set([...refs, 'higiene', 'dx', 'apresentacao', 'identificacao', 'explica', 'duvidas']);
    c.conduta.forEach((x, i) => x.correta && alcancaveis.add('conduta_' + i));
    for (const i of c.itens) assert.ok(alcancaveis.has(i.id), `${c.id}: item impossível de pontuar: ${i.id}`);
  });

  test(`estação perfeita soma 100%: ${c.id}`, () => {
    const s = new OSCE.Sessao(c);
    s.higienizar();
    for (const p of ROTEIROS[c.id]) s.perguntar(p);
    c.exameFisico.forEach((e) => s.examinar(e.id));
    c.exames.forEach((e) => s.solicitar(e.id));
    const corretas = c.conduta.map((x, i) => (x.correta ? i : -1)).filter((i) => i >= 0);
    const r = s.finalizar(c.diagnostico.correta, corretas);
    assert.strictEqual(r.pct, 100);
    assert.ok(r.aprovado);
  });
}

test('pergunta sem sentido recebe resposta padrão e não pontua', () => {
  const s = new OSCE.Sessao(caso('dor-toracica'));
  const { falas } = s.perguntar('xyzzy qwerty');
  assert.strictEqual(falas.length, 0);
  assert.deepStrictEqual(s.marcados, {});
});

test('"oi" não casa com "oito"', () => {
  assert.strictEqual(OSCE.interpretar(caso('dor-toracica'), 'oito').length, 0);
});

test('higienização depois do exame físico não pontua', () => {
  const s = new OSCE.Sessao(caso('apendicite'));
  s.examinar('palp');
  s.higienizar();
  assert.ok(!s.marcados.higiene);
  assert.ok(s.resultado().higieneTardia);
});

test('condutas inadequadas descontam pontos', () => {
  const c = caso('apendicite');
  const s = new OSCE.Sessao(c);
  const erradas = c.conduta.map((x, i) => (!x.correta ? i : -1)).filter((i) => i >= 0);
  const r = s.finalizar(c.diagnostico.correta, erradas);
  assert.strictEqual(r.penalidade, erradas.length);
  assert.strictEqual(r.obtido, 0);
});
