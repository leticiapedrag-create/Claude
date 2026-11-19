/*
 * Motor do simulador OSCE: interpretação das perguntas, registro da estação
 * e cálculo da pontuação. Não depende do DOM (pode ser testado no Node).
 */
(function (root) {
  'use strict';

  function normalize(text) {
    return ' ' + String(text || '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim() + ' ';
  }

  // Falas comuns a todas as estações. Um caso pode substituir qualquer uma
  // delas declarando uma fala com o mesmo id.
  var FALAS_GERAIS = [
    { id: 'saudacao', tema: 'Cumprimento', kw: ['bom dia', 'boa tarde', 'boa noite', 'ola ', 'oi ', 'tudo bem', 'como vai'], r: 'Oi, doutor(a)...' },
    { id: 'apresentacao', tema: 'Apresentação do(a) médico(a)', item: 'apresentacao',
      kw: ['meu nome', 'me chamo', 'sou o dr', 'sou a dr', 'sou o doutor', 'sou a doutora', 'sou doutor', 'sou doutora', 'sou o medico', 'sou a medica', 'sou medico', 'sou medica', 'sou o estudante', 'sou a estudante', 'sou estudante', 'sou o interno', 'sou a interna', 'sou interno', 'sou interna', 'sou o residente', 'sou a residente', 'sou residente', 'sou o academico', 'sou a academica', 'sou academico', 'sou academica', 'vou te atender', 'vou atender', 'vou fazer seu atendimento', 'vou fazer o seu atendimento', 'responsavel pelo seu atendimento', 'medico plantonista', 'medica plantonista'],
      r: 'Prazer, doutor(a).' },
    { id: 'nome', tema: 'Nome do paciente', item: 'identificacao',
      kw: ['seu nome', 'qual o nome', 'qual e o nome', 'como se chama', 'como o senhor se chama', 'como a senhora se chama', 'como voce se chama', 'nome do senhor', 'nome da senhora', 'nome completo', 'como posso te chamar', 'como posso chamar', 'como prefere ser chamad', 'confirmar seu nome', 'confirmar o nome'],
      r: 'Meu nome é {nome}.' },
    { id: 'idade', tema: 'Idade', kw: ['idade', 'quantos anos', 'anos voce tem', 'anos o senhor tem', 'anos a senhora tem', 'data de nascimento'], r: 'Tenho {idade} anos.' },
    { id: 'profissao', tema: 'Profissão', kw: ['trabalha', 'profiss', 'ocupacao', 'emprego', 'faz da vida', 'seu servico', 'o que voce faz', 'o que o senhor faz', 'o que a senhora faz'], r: '{profissao}' },
    { id: 'duvidas', tema: 'Verificação de dúvidas', item: 'duvidas',
      kw: ['alguma duvida', 'tem duvida', 'ficou duvida', 'ficou com duvida', 'ficou alguma', 'duvidas', 'alguma pergunta', 'quer perguntar', 'deseja perguntar', 'gostaria de perguntar', 'ficou claro', 'entendeu o que', 'conseguiu entender', 'quer saber mais'],
      r: 'Acho que entendi, doutor(a). Obrigado(a) por explicar.' },
    { id: 'explica', tema: 'Explicação do diagnóstico/conduta', item: 'explica',
      kw: ['diagnostico', 'suspeit', 'hipotese', 'provavelmente', 'vou explicar', 'vou te explicar', 'deixa eu explicar', 'explicar o que', 'o que voce tem', 'o que o senhor tem', 'o que a senhora tem', 'o seu quadro', 'seu quadro', 'vamos tratar', 'o tratamento sera', 'o tratamento vai', 'vou prescrever', 'vamos iniciar', 'vamos precisar', 'vai precisar', 'vamos internar', 'precisar internar', 'vai ficar internad', 'precisa operar', 'vamos operar', 'precisa de cirurgia', 'precisar de cirurgia'],
      r: '{reacaoExplicacao}' },
    { id: 'consentimento', tema: 'Pedido para examinar', kw: ['examinar', 'te examinar', 'exame fisico', 'posso te examinar', 'posso examinar', 'vou examinar'], r: 'Pode sim, doutor(a).' },
    { id: 'alergias', tema: 'Alergias', kw: ['alergi', 'alergic', 'alergia a algum', 'alergia a remedio', 'alergia a medicamento', 'alergia a alguma medicacao', 'alergico a', 'alergica a'], r: 'Não tenho alergia a nenhum remédio, que eu saiba.' },
    { id: 'medicacoes', tema: 'Medicações em uso', kw: ['remedio', 'medicamento', 'medicacao', 'medicacoes', 'toma algum', 'usa algum', 'faz uso de algum', 'tomando algo', 'tomou algo', 'tomou alguma'], r: 'Não tomo nenhum remédio.' },
    { id: 'comorbidades', tema: 'Doenças prévias', kw: ['doenca', 'comorbidade', 'problema de saude', 'pressao alta', 'hipertens', 'diabet', 'acucar no sangue', 'colesterol', 'problema no coracao', 'problema de coracao', 'rins', 'figado', 'tireoide', 'asma', 'bronquite', 'dpoc', 'enfisema'], r: 'Não tenho nenhuma doença, sempre fui saudável.' },
    { id: 'cirurgias', tema: 'Cirurgias e internações', kw: ['cirurgia', 'operou', 'operad', 'operacao', 'internad', 'internacao'], r: 'Nunca fiz cirurgia nem fiquei internado(a).' },
    { id: 'tabagismo', tema: 'Tabagismo', kw: ['fuma', 'fumo', 'fumante', 'fumou', 'cigarro', 'tabag'], r: 'Não fumo.' },
    { id: 'etilismo', tema: 'Etilismo', kw: ['bebe ', 'bebida', 'alcool', 'cerveja', 'cachaca', 'etilis', 'bebe alcool'], r: 'Só socialmente, de vez em quando.' },
    { id: 'drogas', tema: 'Drogas ilícitas', kw: ['droga', 'maconha', 'cocaina', 'crack', 'entorpecente'], r: 'Não uso drogas, não.' },
    { id: 'familia', tema: 'Antecedentes familiares', kw: ['famili', 'pai ', 'mae ', 'irmao', 'irma ', 'parentes', 'hereditar', 'na sua casa alguem'], r: 'Ninguém da família tem problema sério que eu saiba.' }
  ];

  var RESPOSTAS_PADRAO = [
    'Desculpa, doutor(a), não entendi. Pode perguntar de outro jeito?',
    'Hmm... não sei dizer, doutor(a).',
    'Como assim, doutor(a)? Não entendi a pergunta.'
  ];

  var SECOES = ['Comunicação e postura', 'Anamnese', 'Exame físico', 'Exames complementares', 'Diagnóstico e conduta'];

  var ITENS_COMUNICACAO = [
    { id: 'apresentacao', texto: 'Apresenta-se ao paciente (nome e função)', pts: 1 },
    { id: 'identificacao', texto: 'Identifica o paciente (pergunta/confirma o nome)', pts: 1 },
    { id: 'higiene', texto: 'Higieniza as mãos antes do exame físico', pts: 1 },
    { id: 'explica', texto: 'Explica a hipótese diagnóstica e a conduta em linguagem acessível', pts: 1 },
    { id: 'duvidas', texto: 'Verifica se o paciente tem dúvidas', pts: 1 }
  ];

  function prepararCaso(caso) {
    if (caso._pronto) return caso;
    var proprias = {};
    caso.falas.forEach(function (f) { proprias[f.id] = true; });
    var gerais = FALAS_GERAIS.filter(function (f) { return !proprias[f.id]; });
    caso.todasFalas = caso.falas.concat(gerais).map(function (f) {
      // Palavra-chave terminada em espaço exige palavra inteira ("oi " não casa com "oito").
      return Object.assign({}, f, { kwNorm: f.kw.map(function (k) {
        return normalize(k).trim() + (/\s$/.test(k) ? ' ' : '');
      }) });
    });

    var itens = [];
    ITENS_COMUNICACAO.forEach(function (i) { itens.push(Object.assign({ secao: SECOES[0] }, i)); });
    (caso.checklist.anamnese || []).forEach(function (i) { itens.push(Object.assign({ secao: SECOES[1] }, i)); });
    (caso.checklist.exame || []).forEach(function (i) { itens.push(Object.assign({ secao: SECOES[2] }, i)); });
    (caso.checklist.exames || []).forEach(function (i) { itens.push(Object.assign({ secao: SECOES[3] }, i)); });
    itens.push({ id: 'dx', secao: SECOES[4], texto: 'Hipótese diagnóstica: ' + caso.diagnostico.opcoes[caso.diagnostico.correta], pts: caso.diagnostico.pts || 2 });
    caso.conduta.forEach(function (c, idx) {
      if (c.correta) itens.push({ id: 'conduta_' + idx, secao: SECOES[4], texto: 'Conduta: ' + c.texto, pts: c.pts || 1 });
    });
    caso.itens = itens;
    caso._pronto = true;
    return caso;
  }

  function preencher(texto, caso) {
    var p = caso.paciente;
    return String(texto)
      .replace(/\{nome\}/g, p.nome)
      .replace(/\{idade\}/g, p.idade)
      .replace(/\{profissao\}/g, p.profissao || 'Prefiro não falar disso agora, doutor(a).')
      .replace(/\{reacaoExplicacao\}/g, caso.reacaoExplicacao || 'Entendi, doutor(a).');
  }

  function pontuarFala(fala, textoNorm) {
    var score = 0;
    fala.kwNorm.forEach(function (k) {
      if (k && textoNorm.indexOf(' ' + k) !== -1) score += k.trim().length;
    });
    return score;
  }

  /** Retorna até duas falas que respondem à pergunta, da mais para a menos provável. */
  function interpretar(caso, pergunta) {
    prepararCaso(caso);
    var t = normalize(pergunta);
    var candidatos = caso.todasFalas
      .map(function (f) { return { fala: f, score: pontuarFala(f, t) }; })
      .filter(function (c) { return c.score > 0; })
      .sort(function (a, b) { return b.score - a.score; });
    if (!candidatos.length) return [];
    var res = [candidatos[0].fala];
    var segundo = candidatos.find(function (c, i) {
      return i > 0 && c.score >= candidatos[0].score * 0.75 && c.fala.r !== candidatos[0].fala.r;
    });
    if (segundo) res.push(segundo.fala);
    return res;
  }

  function Sessao(caso, modo) {
    this.caso = prepararCaso(caso);
    this.modo = modo || 'virtual';
    this.inicio = Date.now();
    this.fim = null;
    this.transcricao = [];
    this.marcados = {};
    this.falasFeitas = {};
    this.exameFisico = [];
    this.exames = [];
    this.higieneEm = null;
    this.higieneTardia = false;
    this.primeiroExameEm = null;
    this.dx = null;
    this.condutas = {};
    this.tempoEsgotado = false;
    this._padrao = 0;
  }

  Sessao.prototype.perguntar = function (texto) {
    var caso = this.caso;
    this.transcricao.push({ quem: 'aluno', texto: texto, t: Date.now() });
    var falas = interpretar(caso, texto);
    var self = this;
    var resposta;
    if (!falas.length) {
      resposta = RESPOSTAS_PADRAO[this._padrao++ % RESPOSTAS_PADRAO.length];
    } else {
      resposta = falas.map(function (f) {
        self.falasFeitas[f.id] = true;
        if (f.item) self.marcados[f.item] = true;
        return preencher(f.r, caso);
      }).join(' ');
    }
    this.transcricao.push({ quem: 'paciente', texto: resposta, t: Date.now() });
    return { resposta: resposta, falas: falas };
  };

  Sessao.prototype.higienizar = function () {
    if (!this.higieneEm) this.higieneEm = Date.now();
    this.transcricao.push({ quem: 'acao', texto: '🧼 Higienização das mãos realizada.', t: Date.now() });
    if (!this.primeiroExameEm) this.marcados.higiene = true;
    else if (!this.marcados.higiene) this.higieneTardia = true;
  };

  Sessao.prototype.examinar = function (id) {
    var ex = this.caso.exameFisico.find(function (e) { return e.id === id; });
    if (!ex) return null;
    if (!this.primeiroExameEm) this.primeiroExameEm = Date.now();
    if (this.exameFisico.indexOf(id) === -1) this.exameFisico.push(id);
    if (ex.item) this.marcados[ex.item] = true;
    this.transcricao.push({ quem: 'exame', texto: '🩺 ' + ex.nome + ': ' + ex.r, t: Date.now() });
    return ex;
  };

  Sessao.prototype.solicitar = function (id) {
    var ex = this.caso.exames.find(function (e) { return e.id === id; });
    if (!ex) return null;
    if (this.exames.indexOf(id) === -1) this.exames.push(id);
    if (ex.item) this.marcados[ex.item] = true;
    this.transcricao.push({ quem: 'exame', texto: '🧪 ' + ex.nome + ': ' + ex.r, t: Date.now() });
    return ex;
  };

  Sessao.prototype.finalizar = function (dx, condutas) {
    this.fim = this.fim || Date.now();
    this.dx = dx;
    this.condutas = {};
    var self = this;
    (condutas || []).forEach(function (i) { self.condutas[i] = true; });
    if (dx === this.caso.diagnostico.correta) this.marcados.dx = true;
    this.caso.conduta.forEach(function (c, idx) {
      if (c.correta && self.condutas[idx]) self.marcados['conduta_' + idx] = true;
    });
    return this.resultado();
  };

  /** Calcula o resultado a partir de um conjunto de itens marcados. */
  function calcularResultado(caso, marcados, condutasErradas) {
    prepararCaso(caso);
    var porSecao = {};
    SECOES.forEach(function (s) { porSecao[s] = { obtido: 0, max: 0 }; });
    var max = 0, obtido = 0;
    var itens = caso.itens.map(function (i) {
      var feito = !!marcados[i.id];
      max += i.pts;
      porSecao[i.secao].max += i.pts;
      if (feito) { obtido += i.pts; porSecao[i.secao].obtido += i.pts; }
      return Object.assign({ feito: feito }, i);
    });
    var penalidade = (condutasErradas || []).length;
    var final = Math.max(0, obtido - penalidade);
    return {
      itens: itens,
      porSecao: porSecao,
      obtido: final,
      bruto: obtido,
      penalidade: penalidade,
      max: max,
      pct: max ? Math.round((final / max) * 100) : 0,
      aprovado: max ? final / max >= 0.7 : false
    };
  }

  Sessao.prototype.condutasErradas = function () {
    var self = this;
    return this.caso.conduta
      .map(function (c, idx) { return { c: c, idx: idx }; })
      .filter(function (o) { return !o.c.correta && self.condutas[o.idx]; })
      .map(function (o) { return o.c.texto; });
  };

  Sessao.prototype.resultado = function () {
    var r = calcularResultado(this.caso, this.marcados, this.condutasErradas());
    r.condutasErradas = this.condutasErradas();
    r.duracaoSeg = Math.round(((this.fim || Date.now()) - this.inicio) / 1000);
    r.higieneTardia = !!this.higieneTardia;
    return r;
  };

  var api = {
    normalize: normalize,
    prepararCaso: prepararCaso,
    interpretar: interpretar,
    preencher: preencher,
    Sessao: Sessao,
    calcularResultado: calcularResultado,
    SECOES: SECOES,
    FALAS_GERAIS: FALAS_GERAIS
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.OSCE = api;
})(typeof window !== 'undefined' ? window : this);
