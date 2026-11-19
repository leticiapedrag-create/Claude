/* Interface do Simulador OSCE */
(function () {
  'use strict';

  var CASOS = window.OSCE_CASOS;
  var OSCE = window.OSCE;
  var app = document.getElementById('app');
  var LEITURA_SEG = 60;

  // ------------------------------------------------------------ utilidades
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function mmss(seg) {
    seg = Math.max(0, Math.ceil(seg));
    return String(Math.floor(seg / 60)).padStart(2, '0') + ':' + String(seg % 60).padStart(2, '0');
  }
  function embaralhar(lista, semente) {
    var a = lista.slice(), s = semente || 1;
    for (var i = a.length - 1; i > 0; i--) {
      s = (s * 9301 + 49297) % 233280;
      var j = Math.floor((s / 233280) * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function armazenar(chave, valor) {
    try {
      if (valor === undefined) return JSON.parse(localStorage.getItem(chave));
      localStorage.setItem(chave, JSON.stringify(valor));
    } catch (e) { return null; }
  }
  var toastTimer;
  function toast(msg, tipo) {
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'visivel ' + (tipo || '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.className = ''; }, 3200);
  }
  function bip(freq, dur) {
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      var ctx = bip.ctx || (bip.ctx = new Ctx());
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = freq || 880;
      g.gain.setValueAtTime(0.15, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (dur || 0.4));
      o.connect(g); g.connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + (dur || 0.4));
    } catch (e) { /* sem áudio */ }
  }

  // ------------------------------------------------------------ voz
  var optVoz = document.getElementById('opt-voz');
  optVoz.checked = !!armazenar('osce_voz');
  optVoz.addEventListener('change', function () {
    armazenar('osce_voz', optVoz.checked);
    if (!optVoz.checked && window.speechSynthesis) speechSynthesis.cancel();
  });
  function falar(texto) {
    if (!optVoz.checked || !window.speechSynthesis) return;
    var u = new SpeechSynthesisUtterance(texto.replace(/\(.*?\)/g, ''));
    u.lang = 'pt-BR';
    var voz = speechSynthesis.getVoices().find(function (v) { return /^pt(-|_)BR/i.test(v.lang); });
    if (voz) u.voice = voz;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }
  var Reconhecimento = window.SpeechRecognition || window.webkitSpeechRecognition;

  // ------------------------------------------------------------ cronômetro
  function Cronometro(segundos, aoTique, aoFim) {
    this.total = segundos;
    this.restante = segundos;
    this.aoTique = aoTique;
    this.aoFim = aoFim;
    this.id = null;
  }
  Cronometro.prototype.iniciar = function () {
    if (this.id) return;
    var self = this, ultimo = Date.now();
    this.id = setInterval(function () {
      var agora = Date.now();
      self.restante -= (agora - ultimo) / 1000;
      ultimo = agora;
      self.aoTique(self.restante);
      if (self.restante <= 0) { self.parar(); self.aoFim(); }
    }, 250);
    this.aoTique(this.restante);
  };
  Cronometro.prototype.parar = function () { clearInterval(this.id); this.id = null; };
  Cronometro.prototype.rodando = function () { return !!this.id; };

  // ------------------------------------------------------------ estado
  var estado = { tela: 'inicio', cron: null, sessao: null };
  function limparTela() {
    if (estado.cron) estado.cron.parar();
    estado.cron = null;
    if (window.speechSynthesis) speechSynthesis.cancel();
    if (estado.rec) { try { estado.rec.abort(); } catch (e) { } estado.rec = null; }
  }
  function emAndamento() { return estado.tela === 'estacao' || estado.tela === 'avaliador'; }
  function ir(fn) {
    limparTela();
    fn.apply(null, Array.prototype.slice.call(arguments, 1));
    window.scrollTo(0, 0);
    app.focus({ preventScroll: true });
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-acao="inicio"]');
    if (!b) return;
    if (emAndamento() && !confirm('Sair da estação? O progresso será perdido.')) return;
    ir(telaInicio);
  });
  window.addEventListener('beforeunload', function (e) {
    if (emAndamento()) { e.preventDefault(); e.returnValue = ''; }
  });

  // ------------------------------------------------------------ início
  function historico() { return armazenar('osce_historico') || []; }

  function telaInicio() {
    estado.tela = 'inicio';
    var hist = historico();
    var media = hist.length ? Math.round(hist.reduce(function (s, h) { return s + h.pct; }, 0) / hist.length) : null;
    var areas = CASOS.map(function (c) { return c.area.split(' · ')[0]; }).filter(function (a, i, arr) { return arr.indexOf(a) === i; });
    var filtro = estado.filtro || 'Todas';

    app.innerHTML =
      '<section class="hero">' +
        '<div><h1>Treine para o OSCE</h1>' +
        '<p>Atenda pacientes virtuais com cronômetro, faça a anamnese conversando, examine, peça exames e receba sua nota pelo checklist da estação. Ou treine em dupla: um colega faz o paciente e avalia.</p></div>' +
        '<div class="stats">' +
          '<div class="stat"><span>' + hist.length + '</span>estações feitas</div>' +
          '<div class="stat"><span>' + (media == null ? '—' : media + '%') + '</span>média geral</div>' +
          '<div class="stat"><span>' + CASOS.length + '</span>estações disponíveis</div>' +
        '</div>' +
      '</section>' +
      '<div class="filtros" role="tablist">' +
        ['Todas'].concat(areas).map(function (a) {
          return '<button class="chip' + (a === filtro ? ' ativo' : '') + '" data-filtro="' + esc(a) + '">' + esc(a) + '</button>';
        }).join('') +
      '</div>' +
      '<section class="grade-casos">' +
        CASOS.filter(function (c) { return filtro === 'Todas' || c.area.indexOf(filtro) === 0; }).map(function (c) {
          var tentativas = hist.filter(function (h) { return h.id === c.id; });
          var melhor = tentativas.length ? Math.max.apply(null, tentativas.map(function (h) { return h.pct; })) : null;
          return '<article class="card-caso">' +
            '<div class="card-topo"><span class="avatar-sm">' + c.paciente.avatar + '</span>' +
            '<div><div class="area">' + esc(c.area) + '</div><h3>' + esc(c.titulo) + '</h3></div></div>' +
            '<p class="local">📍 ' + esc(c.local) + ' · ⏱ ' + c.duracao + ' min · ' + esc(c.nivel) + '</p>' +
            (melhor != null ? '<p class="melhor">Melhor nota: <strong>' + melhor + '%</strong> (' + tentativas.length + ' tentativa' + (tentativas.length > 1 ? 's' : '') + ')</p>' : '<p class="melhor muted">Ainda não realizada</p>') +
            '<div class="card-acoes">' +
              '<button class="btn primario" data-iniciar="' + c.id + '">Paciente virtual</button>' +
              '<button class="btn" data-dupla="' + c.id + '" title="Um colega faz o papel do paciente e avalia pelo checklist">Modo dupla</button>' +
            '</div></article>';
        }).join('') +
      '</section>' +
      telaHistorico(hist);

    $all('[data-filtro]').forEach(function (b) {
      b.onclick = function () { estado.filtro = b.dataset.filtro; telaInicio(); };
    });
    $all('[data-iniciar]').forEach(function (b) {
      b.onclick = function () { ir(telaPorta, caso(b.dataset.iniciar), 'virtual'); };
    });
    $all('[data-dupla]').forEach(function (b) {
      b.onclick = function () { ir(telaPorta, caso(b.dataset.dupla), 'dupla'); };
    });
    var limpar = $('#limpar-hist');
    if (limpar) limpar.onclick = function () {
      if (confirm('Apagar todo o histórico?')) { armazenar('osce_historico', []); telaInicio(); }
    };
  }

  function telaHistorico(hist) {
    if (!hist.length) return '';
    return '<section class="historico"><div class="secao-titulo"><h2>Histórico</h2>' +
      '<button class="btn-link" id="limpar-hist">Limpar</button></div>' +
      '<div class="tabela-wrap"><table><thead><tr><th>Data</th><th>Estação</th><th>Modo</th><th>Nota</th></tr></thead><tbody>' +
      hist.slice().reverse().slice(0, 15).map(function (h) {
        return '<tr><td>' + new Date(h.data).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) + '</td>' +
          '<td>' + esc(h.titulo) + '</td><td>' + (h.modo === 'dupla' ? 'Dupla' : 'Virtual') + '</td>' +
          '<td><span class="nota ' + (h.pct >= 70 ? 'ok' : 'baixa') + '">' + h.pct + '%</span></td></tr>';
      }).join('') +
      '</tbody></table></div></section>';
  }

  function caso(id) { return CASOS.find(function (c) { return c.id === id; }); }

  // ------------------------------------------------------------ porta da estação
  function blocoInstrucoes(c) {
    return '<div class="porta-cenario"><h4>Cenário</h4><p>' + esc(c.cenario) + '</p></div>' +
      '<div><h4>Tarefas</h4><ol class="tarefas">' + c.tarefas.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ol></div>';
  }

  function telaPorta(c, modo) {
    estado.tela = 'porta';
    var dupla = modo === 'dupla';
    app.innerHTML =
      '<section class="porta">' +
        '<div class="porta-placa">' +
          '<div class="porta-cab"><span class="area">' + esc(c.area) + '</span><span>⏱ ' + c.duracao + ' minutos</span></div>' +
          '<h2>' + esc(c.titulo) + '</h2>' +
          '<p class="local">📍 ' + esc(c.local) + '</p>' +
          blocoInstrucoes(c) +
        '</div>' +
        '<aside class="porta-lado">' +
          (dupla
            ? '<h3>Modo dupla</h3><p>O(a) <strong>candidato(a)</strong> lê esta placa. O(a) <strong>colega</strong> abre a próxima tela, que tem o roteiro do paciente, os achados de exame e o checklist para marcar durante a estação.</p>'
            : '<h3>Como funciona</h3><ul class="dicas"><li>Converse com o paciente digitando (ou falando 🎤) como faria na prova.</li><li>Higienize as mãos antes de examinar.</li><li>Use as abas para examinar e pedir exames.</li><li>Explique o diagnóstico e pergunte se há dúvidas.</li><li>Ao encerrar, marque hipótese e conduta.</li></ul>') +
          '<div class="leitura"><span>Tempo de leitura</span><strong id="leitura">' + mmss(LEITURA_SEG) + '</strong></div>' +
          '<button class="btn primario grande" id="entrar">Entrar na estação</button>' +
          '<button class="btn-link" data-acao="inicio">← Voltar</button>' +
        '</aside>' +
      '</section>';

    var entrar = function () { ir(dupla ? telaAvaliador : telaEstacao, c); };
    estado.cron = new Cronometro(LEITURA_SEG, function (r) { $('#leitura').textContent = mmss(r); }, function () { bip(660, 0.5); entrar(); });
    estado.cron.iniciar();
    $('#entrar').onclick = entrar;
  }

  // ------------------------------------------------------------ estação (paciente virtual)
  function telaEstacao(c) {
    estado.tela = 'estacao';
    var s = estado.sessao = new OSCE.Sessao(c, 'virtual');
    var desktop = window.matchMedia('(min-width: 960px)').matches;
    var aba = desktop ? 'instrucoes' : 'chat';
    var grupos = {};
    c.exames.forEach(function (e) { (grupos[e.grupo] = grupos[e.grupo] || []).push(e); });

    app.innerHTML =
      '<section class="estacao">' +
        '<div class="estacao-barra">' +
          '<div class="estacao-titulo"><span class="area">' + esc(c.area) + '</span><strong>' + esc(c.titulo) + '</strong></div>' +
          '<div class="timer" id="timer" role="timer" aria-live="off">' + mmss(c.duracao * 60) + '</div>' +
          '<div class="estacao-acoes">' +
            '<button class="btn" id="btn-higiene">🧼 <span>Higienizar as mãos</span></button>' +
            '<button class="btn primario" id="btn-encerrar">Encerrar</button>' +
          '</div>' +
        '</div>' +
        '<nav class="abas" role="tablist">' +
          [['chat', '💬 Conversa'], ['exame', '🩺 Exame físico'], ['exames', '🧪 Exames'], ['instrucoes', '📋 Instruções']].map(function (a) {
            return '<button role="tab" class="aba aba-' + a[0] + '" data-aba="' + a[0] + '">' + a[1] + '</button>';
          }).join('') +
        '</nav>' +
        '<div class="estacao-grid">' +
          '<section class="painel painel-chat" data-painel="chat">' +
            '<div class="paciente-head"><div class="avatar">' + c.paciente.avatar + '</div><div>' +
              '<strong>' + esc(c.paciente.acompanhante ? c.paciente.acompanhante + ' — acompanhando ' + c.paciente.nome : 'Paciente') + '</strong>' +
              '<span>' + esc(c.local) + '</span></div></div>' +
            '<div class="chat" id="chat" aria-live="polite"></div>' +
            '<form class="chat-form" id="form-pergunta" autocomplete="off">' +
              (Reconhecimento ? '<button type="button" class="btn-icone" id="mic" title="Falar a pergunta" aria-label="Falar a pergunta">🎤</button>' : '') +
              '<input id="pergunta" placeholder="Fale com o paciente…" aria-label="Sua fala para o paciente">' +
              '<button class="btn primario" type="submit">Enviar</button>' +
            '</form>' +
          '</section>' +
          '<section class="painel painel-dir" data-painel="exame">' +
            '<p class="ajuda">Selecione o que deseja examinar. Lembre-se de higienizar as mãos antes.</p>' +
            '<div class="botoes-grade">' + c.exameFisico.map(function (e) {
              return '<button class="btn-exame" data-ef="' + e.id + '">' + esc(e.nome) + '</button>';
            }).join('') + '</div>' +
            '<div class="achados" id="achados-ef"></div>' +
          '</section>' +
          '<section class="painel painel-dir" data-painel="exames">' +
            '<p class="ajuda">Solicite apenas o que for pertinente. Os resultados chegam na hora.</p>' +
            Object.keys(grupos).map(function (g) {
              return '<h4>' + esc(g) + '</h4><div class="botoes-grade">' + grupos[g].map(function (e) {
                return '<button class="btn-exame" data-lab="' + e.id + '">' + esc(e.nome) + '</button>';
              }).join('') + '</div>';
            }).join('') +
            '<div class="achados" id="achados-lab"></div>' +
          '</section>' +
          '<section class="painel painel-dir" data-painel="instrucoes">' + blocoInstrucoes(c) +
            '<div class="dica-box">💡 Dica: fale de forma natural. Ex.: “Bom dia, sou o(a) Dr(a). …”, “Onde é a dor?”, “Tem alergia a algum remédio?”. Ao final, explique o diagnóstico e pergunte se há dúvidas.</div>' +
          '</section>' +
        '</div>' +
      '</section>';

    function mostrarAba(nova) {
      aba = nova;
      $all('.aba').forEach(function (b) { b.classList.toggle('ativo', b.dataset.aba === aba); b.setAttribute('aria-selected', b.dataset.aba === aba); });
      $all('.painel').forEach(function (p) {
        p.classList.toggle('mobile-ativo', p.dataset.painel === aba);
        if (p.classList.contains('painel-dir') && aba !== 'chat') p.classList.toggle('ativo', p.dataset.painel === aba);
      });
    }
    if (desktop) mostrarAba('instrucoes'); else { $('[data-painel="instrucoes"]').classList.add('ativo'); mostrarAba('chat'); }
    $all('.aba').forEach(function (b) { b.onclick = function () { mostrarAba(b.dataset.aba); }; });

    var chat = $('#chat');
    function msg(quem, texto) {
      var d = document.createElement('div');
      d.className = 'msg msg-' + quem;
      d.textContent = texto;
      chat.appendChild(d);
      chat.scrollTop = chat.scrollHeight;
      return d;
    }
    msg('sistema', 'Você entra no consultório. ' + c.paciente.avatar + ' ' + (c.paciente.acompanhante || 'O(a) paciente') + ' está à sua espera.');
    setTimeout(function () { msg('paciente', c.abertura); falar(c.abertura); }, 500);

    var form = $('#form-pergunta'), input = $('#pergunta');
    form.onsubmit = function (e) {
      e.preventDefault();
      var texto = input.value.trim();
      if (!texto) return;
      input.value = '';
      msg('aluno', texto);
      var resp = s.perguntar(texto).resposta;
      var digitando = msg('paciente digitando', '…');
      setTimeout(function () {
        digitando.className = 'msg msg-paciente';
        digitando.textContent = resp;
        chat.scrollTop = chat.scrollHeight;
        falar(resp);
      }, 350 + Math.min(900, resp.length * 8));
    };
    if (!desktop) { /* não abre o teclado automaticamente no celular */ } else input.focus();

    var mic = $('#mic');
    if (mic) mic.onclick = function () {
      if (estado.rec) { estado.rec.stop(); return; }
      var rec = estado.rec = new Reconhecimento();
      rec.lang = 'pt-BR';
      rec.interimResults = true;
      mic.classList.add('gravando');
      rec.onresult = function (ev) {
        var t = Array.prototype.map.call(ev.results, function (r) { return r[0].transcript; }).join('');
        input.value = t;
        if (ev.results[ev.results.length - 1].isFinal) form.requestSubmit();
      };
      rec.onerror = function (ev) { if (ev.error !== 'aborted') toast('Não foi possível usar o microfone (' + ev.error + ').', 'erro'); };
      rec.onend = function () { mic.classList.remove('gravando'); estado.rec = null; };
      rec.start();
    };

    $('#btn-higiene').onclick = function () {
      s.higienizar();
      msg('sistema', '🧼 Você higienizou as mãos.');
      toast('Mãos higienizadas 🧼');
      this.classList.add('feito');
    };

    function registrarAchado(alvo, nome, r, botao) {
      botao.classList.add('feito');
      var d = document.createElement('div');
      d.className = 'achado';
      d.innerHTML = '<strong>' + esc(nome) + '</strong><p>' + esc(r) + '</p>';
      $(alvo).prepend(d);
      msg('sistema', nome + ': ' + r);
    }
    $all('[data-ef]').forEach(function (b) {
      b.onclick = function () {
        if (b.classList.contains('feito')) return;
        if (!s.higieneEm && !s.primeiroExameEm) toast('Atenção: você não higienizou as mãos antes de examinar.', 'aviso');
        var e = s.examinar(b.dataset.ef);
        registrarAchado('#achados-ef', e.nome, e.r, b);
      };
    });
    $all('[data-lab]').forEach(function (b) {
      b.onclick = function () {
        if (b.classList.contains('feito')) return;
        var e = s.solicitar(b.dataset.lab);
        registrarAchado('#achados-lab', e.nome, e.r, b);
      };
    });

    var timer = $('#timer'), avisou = false;
    estado.cron = new Cronometro(c.duracao * 60, function (r) {
      timer.textContent = mmss(r);
      if (r <= 120 && !avisou) {
        avisou = true;
        timer.classList.add('alerta');
        bip(880, 0.3);
        toast('⏰ Faltam 2 minutos!', 'aviso');
      }
    }, function () {
      bip(440, 0.8);
      s.tempoEsgotado = true;
      toast('⏰ Tempo esgotado!', 'aviso');
      ir(telaFinalizacao, s);
    });
    estado.cron.iniciar();

    $('#btn-encerrar').onclick = function () {
      if (confirm('Encerrar a estação e responder hipótese diagnóstica e conduta?')) ir(telaFinalizacao, s);
    };
  }

  // ------------------------------------------------------------ hipótese e conduta
  function telaFinalizacao(s) {
    estado.tela = 'finalizacao';
    s.fim = s.fim || Date.now();
    var c = s.caso;
    var semente = s.inicio % 1000 + 7;
    var dxOrdem = embaralhar(c.diagnostico.opcoes.map(function (_, i) { return i; }), semente);
    var cdOrdem = embaralhar(c.conduta.map(function (_, i) { return i; }), semente + 3);

    app.innerHTML =
      '<section class="finalizacao">' +
        '<h2>' + (s.tempoEsgotado ? '⏰ Tempo esgotado — ' : '') + 'Fechamento da estação</h2>' +
        '<p class="muted">' + esc(c.titulo) + ' · ' + esc(c.paciente.nome) + '</p>' +
        '<form id="form-final">' +
          '<fieldset><legend>Qual a principal hipótese diagnóstica?</legend>' +
            dxOrdem.map(function (i) {
              return '<label class="opcao"><input type="radio" name="dx" value="' + i + '"> <span>' + esc(c.diagnostico.opcoes[i]) + '</span></label>';
            }).join('') +
          '</fieldset>' +
          '<fieldset><legend>Quais condutas você indica? <small>(marque todas as adequadas — condutas inadequadas descontam pontos)</small></legend>' +
            cdOrdem.map(function (i) {
              return '<label class="opcao"><input type="checkbox" name="cd" value="' + i + '"> <span>' + esc(c.conduta[i].texto) + '</span></label>';
            }).join('') +
          '</fieldset>' +
          '<button class="btn primario grande" type="submit">Ver meu desempenho</button>' +
        '</form>' +
      '</section>';

    $('#form-final').onsubmit = function (e) {
      e.preventDefault();
      var dx = $('input[name="dx"]:checked');
      if (!dx && !confirm('Você não marcou uma hipótese diagnóstica. Continuar assim mesmo?')) return;
      var cds = $all('input[name="cd"]:checked').map(function (i) { return +i.value; });
      var r = s.finalizar(dx ? +dx.value : null, cds);
      salvarHistorico(c, r, 'virtual');
      ir(telaResultado, c, r, s);
    };
  }

  function salvarHistorico(c, r, modo) {
    var hist = historico();
    hist.push({ id: c.id, titulo: c.titulo, data: new Date().toISOString(), pct: r.pct, obtido: r.obtido, max: r.max, modo: modo });
    armazenar('osce_historico', hist.slice(-200));
  }

  // ------------------------------------------------------------ resultado
  function telaResultado(c, r, s) {
    estado.tela = 'resultado';
    var cor = r.pct >= 70 ? 'var(--ok)' : r.pct >= 50 ? 'var(--aviso)' : 'var(--erro)';
    var secoes = OSCE.SECOES.filter(function (sec) { return r.porSecao[sec].max > 0; });

    app.innerHTML =
      '<section class="resultado">' +
        '<div class="resultado-topo">' +
          '<div class="anel" style="--pct:' + r.pct + ';--cor:' + cor + '"><div><strong>' + r.pct + '%</strong><span>' + r.obtido + ' / ' + r.max + ' pts</span></div></div>' +
          '<div class="resultado-resumo">' +
            '<span class="area">' + esc(c.area) + '</span>' +
            '<h2>' + esc(c.titulo) + '</h2>' +
            '<p class="veredito ' + (r.aprovado ? 'ok' : 'baixa') + '">' + (r.aprovado ? '✅ Desempenho satisfatório' : '⚠️ Abaixo do esperado (meta: 70%)') + '</p>' +
            (r.duracaoSeg ? '<p class="muted">Tempo utilizado: ' + mmss(r.duracaoSeg) + (s && s.tempoEsgotado ? ' (esgotado)' : '') + '</p>' : '') +
            '<div class="barras">' + secoes.map(function (sec) {
              var p = r.porSecao[sec], pc = Math.round((p.obtido / p.max) * 100);
              return '<div class="barra"><div class="barra-rot"><span>' + esc(sec) + '</span><span>' + p.obtido + '/' + p.max + '</span></div>' +
                '<div class="barra-trilho"><div style="width:' + pc + '%"></div></div></div>';
            }).join('') + '</div>' +
          '</div>' +
        '</div>' +
        (r.penalidade ? '<div class="alerta-box erro"><strong>Condutas inadequadas marcadas (−' + r.penalidade + ' pt):</strong><ul>' + r.condutasErradas.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div>' : '') +
        (r.higieneTardia ? '<div class="alerta-box aviso">🧼 Você higienizou as mãos somente depois de iniciar o exame físico.</div>' : '') +
        '<h3>Checklist da estação</h3>' +
        secoes.map(function (sec) {
          return '<div class="check-secao"><h4>' + esc(sec) + '</h4><ul class="checklist">' +
            r.itens.filter(function (i) { return i.secao === sec; }).map(function (i) {
              return '<li class="' + (i.feito ? 'feito' : 'faltou') + '"><span class="marca">' + (i.feito ? '✓' : '✗') + '</span><span>' + esc(i.texto) + '</span><span class="pts">' + (i.feito ? i.pts : 0) + '/' + i.pts + '</span></li>';
            }).join('') + '</ul></div>';
        }).join('') +
        '<h3>Pontos de aprendizado</h3><ul class="comentarios">' + c.comentarios.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' +
        (s && s.transcricao.length ? '<details class="transcricao"><summary>Ver transcrição da estação</summary>' +
          s.transcricao.map(function (m) {
            var rot = { aluno: 'Você', paciente: c.paciente.acompanhante ? 'Acompanhante' : 'Paciente', acao: 'Ação', exame: 'Exame' }[m.quem];
            return '<p class="t-' + m.quem + '"><strong>' + rot + ':</strong> ' + esc(m.texto) + '</p>';
          }).join('') + '</details>' : '') +
        '<div class="resultado-acoes">' +
          '<button class="btn primario" id="refazer">↻ Refazer estação</button>' +
          '<button class="btn" data-acao="inicio">Escolher outra estação</button>' +
        '</div>' +
      '</section>';

    $('#refazer').onclick = function () { ir(telaPorta, c, s ? 'virtual' : 'dupla'); };
  }

  // ------------------------------------------------------------ modo dupla (avaliador)
  function telaAvaliador(c) {
    estado.tela = 'avaliador';
    OSCE.prepararCaso(c);
    var marcados = {};
    var ocultar = { saudacao: 1, consentimento: 1 };
    var falas = c.todasFalas.filter(function (f) { return !ocultar[f.id] && f.tema !== '—'; });

    app.innerHTML =
      '<section class="avaliador">' +
        '<div class="estacao-barra">' +
          '<div class="estacao-titulo"><span class="area">Modo dupla · avaliador(a)</span><strong>' + esc(c.titulo) + '</strong></div>' +
          '<div class="timer" id="timer">' + mmss(c.duracao * 60) + '</div>' +
          '<div class="estacao-acoes">' +
            '<button class="btn" id="btn-pausa">⏸ Pausar</button>' +
            '<button class="btn primario" id="btn-fim">Finalizar</button>' +
          '</div>' +
        '</div>' +
        '<div class="avaliador-grid">' +
          '<div class="roteiro">' +
            '<details open><summary>🎭 Roteiro do paciente</summary>' +
              '<p class="ajuda">Você é <strong>' + esc(c.paciente.acompanhante || c.paciente.nome) + '</strong>' + (c.paciente.acompanhante ? ' (acompanhando ' + esc(c.paciente.nome) + ', ' + c.paciente.idade + ' anos)' : ', ' + c.paciente.idade + ' anos') + '. Responda somente ao que for perguntado.</p>' +
              '<div class="fala-abertura"><strong>Fala inicial:</strong> “' + esc(c.abertura) + '”</div>' +
              '<dl class="falas">' + falas.map(function (f) {
                return '<dt>' + esc(f.tema) + (f.item ? ' <span class="badge">pontua</span>' : '') + '</dt><dd>' + esc(OSCE.preencher(f.r, c)) + '</dd>';
              }).join('') + '</dl>' +
            '</details>' +
            '<details><summary>🩺 Achados do exame físico</summary><p class="ajuda">Informe ao candidato apenas o que ele examinar.</p><dl class="falas">' +
              c.exameFisico.map(function (e) { return '<dt>' + esc(e.nome) + '</dt><dd>' + esc(e.r) + '</dd>'; }).join('') + '</dl></details>' +
            '<details><summary>🧪 Resultados de exames</summary><p class="ajuda">Entregue apenas os exames solicitados.</p><dl class="falas">' +
              c.exames.map(function (e) { return '<dt>' + esc(e.nome) + '</dt><dd>' + esc(e.r) + '</dd>'; }).join('') + '</dl></details>' +
          '</div>' +
          '<div class="painel-check">' +
            '<h3>Checklist <span class="muted" id="parcial"></span></h3>' +
            OSCE.SECOES.map(function (sec) {
              var itens = c.itens.filter(function (i) { return i.secao === sec; });
              if (!itens.length) return '';
              return '<h4>' + esc(sec) + '</h4>' + itens.map(function (i) {
                return '<label class="opcao check"><input type="checkbox" data-item="' + i.id + '"> <span>' + esc(i.texto) + '</span><em>' + i.pts + ' pt' + (i.pts > 1 ? 's' : '') + '</em></label>';
              }).join('');
            }).join('') +
          '</div>' +
        '</div>' +
      '</section>';

    function atualizarParcial() {
      var r = OSCE.calcularResultado(c, marcados);
      $('#parcial').textContent = '· ' + r.obtido + '/' + r.max + ' pts';
    }
    $all('[data-item]').forEach(function (cb) {
      cb.onchange = function () { marcados[cb.dataset.item] = cb.checked; atualizarParcial(); };
    });
    atualizarParcial();

    var timer = $('#timer'), avisou = false, inicio = Date.now();
    estado.cron = new Cronometro(c.duracao * 60, function (r) {
      timer.textContent = mmss(r);
      if (r <= 120 && !avisou) { avisou = true; timer.classList.add('alerta'); bip(880, 0.3); toast('⏰ Faltam 2 minutos!', 'aviso'); }
    }, function () { bip(440, 0.8); timer.classList.add('fim'); toast('⏰ Tempo esgotado! Termine de marcar o checklist.', 'aviso'); });
    estado.cron.iniciar();

    $('#btn-pausa').onclick = function () {
      if (estado.cron.rodando()) { estado.cron.parar(); this.textContent = '▶ Continuar'; }
      else if (estado.cron.restante > 0) { estado.cron.iniciar(); this.textContent = '⏸ Pausar'; }
    };
    $('#btn-fim').onclick = function () {
      if (!confirm('Finalizar a avaliação?')) return;
      var r = OSCE.calcularResultado(c, marcados);
      r.condutasErradas = [];
      r.duracaoSeg = Math.round((Date.now() - inicio) / 1000);
      salvarHistorico(c, r, 'dupla');
      ir(telaResultado, c, r, null);
    };
  }

  telaInicio();
})();
