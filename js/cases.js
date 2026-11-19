/*
 * Banco de estações OSCE.
 *
 * Cada fala tem palavras-chave (kw) normalizadas sem acento. A pergunta do
 * aluno é comparada com elas; a fala com mais correspondências responde.
 * Palavra-chave terminada em espaço exige palavra inteira.
 * "item" liga a fala/exame a um item do checklist.
 */
(function (root) {
  'use strict';

  var KW = {
    inicio: ['quando comec', 'comecou quando', 'ha quanto tempo', 'faz quanto tempo', 'desde quando', 'quanto tempo', 'inicio', 'quando iniciou', 'quando foi que', 'comecou', 'que horas', 'de repente'],
    local: ['onde', 'local', 'lugar', 'localiza', 'regiao', 'aponta', 'mostra onde', 'em que parte'],
    carater: ['como e a dor', 'como e essa dor', 'tipo de dor', 'tipo da dor', 'caracteristica', 'aperto', 'pontada', 'queima', 'peso', 'fisgada', 'facada', 'colica', 'latej', 'descrev', 'como ela e', 'jeito da dor', 'como voce sente'],
    intensidade: ['intensidade', 'nota', '0 a 10', 'zero a dez', 'de 0', 'de zero', 'escala', 'quanto doi', 'muito forte', 'forte e', 'quao forte'],
    irradiacao: ['irradi', 'espalha', 'vai para', 'vai pra', 'corre para', 'outro lugar', 'outra parte', 'outro local', 'reflete', 'braco', 'mandibula', 'queixo', 'costas'],
    fatores: ['melhora', 'piora', 'alivi', 'agrava', 'fator', 'posicao', 'respira fundo', 'quando respira', 'repouso', 'parado'],
    nausea: ['nausea', 'enjo', 'vomit', 'vontade de vomitar', 'ansia'],
    febre: ['febre', 'febril', 'temperatura', 'calafrio', 'quente'],
    dispneia: ['falta de ar', 'dispneia', 'cansaco', 'cansad', 'respirar', 'folego', 'ar ']
  };

  function k() { // concatena listas de palavras-chave
    return Array.prototype.concat.apply([], arguments);
  }

  var CASOS = [
    // ------------------------------------------------------------------ 1
    {
      id: 'dor-toracica',
      titulo: 'Dor torácica na emergência',
      area: 'Clínica Médica · Cardiologia',
      nivel: 'Intermediário',
      duracao: 10,
      local: 'UPA 24 horas',
      paciente: { nome: 'José Carlos Pereira', idade: 58, sexo: 'M', avatar: '👨🏻‍🦳', profissao: 'Sou motorista de ônibus há 30 anos.' },
      cenario: 'Você é o(a) médico(a) plantonista de uma UPA. José Carlos, 58 anos, chega trazido pela esposa com dor no peito há cerca de 1 hora. Triagem: PA 150x95 mmHg, FC 98 bpm, FR 20 irpm, SatO₂ 95% em ar ambiente, Tax 36,5 °C.',
      tarefas: [
        'Realize anamnese dirigida à queixa principal.',
        'Realize o exame físico pertinente.',
        'Solicite e interprete os exames complementares necessários.',
        'Formule a hipótese diagnóstica, defina a conduta inicial e explique ao paciente.'
      ],
      abertura: 'Doutor(a), tô com uma dor muito forte no peito... parece que tem um elefante sentado em cima de mim.',
      reacaoExplicacao: 'Infarto?! Meu Deus... Meu pai morreu disso. Vai dar tudo certo, doutor(a)?',
      falas: [
        { id: 'local', tema: 'Localização da dor', item: 'local', kw: KW.local, r: 'É aqui no meio do peito (aponta para o esterno), por trás do osso.' },
        { id: 'inicio', tema: 'Início e duração', item: 'inicio', kw: KW.inicio, r: 'Começou faz mais ou menos 1 hora. Eu estava subindo a escada de casa com as sacolas do mercado.' },
        { id: 'carater', tema: 'Característica da dor', item: 'carater', kw: KW.carater, r: 'É um aperto, uma pressão forte, como se tivesse um peso em cima do peito.' },
        { id: 'intensidade', tema: 'Intensidade', item: 'intensidade', kw: KW.intensidade, r: 'Nota 9, doutor(a). Nunca senti nada igual.' },
        { id: 'irradiacao', tema: 'Irradiação', item: 'irradiacao', kw: KW.irradiacao, r: 'Ela vai para o braço esquerdo e sobe para o queixo.' },
        { id: 'fatores', tema: 'Fatores de melhora/piora', item: 'fatores', kw: KW.fatores, r: 'Não melhora com nada. Fiquei parado e continuou igual. Não muda com a respiração nem quando aperto o peito.' },
        { id: 'sudorese', tema: 'Sudorese e náuseas', item: 'associados', kw: k(KW.nausea, ['suor', 'suando', 'sudorese', 'suar', 'outro sintoma', 'outros sintomas', 'algo mais', 'mais alguma coisa']), r: 'Estou suando frio e com um pouco de enjoo. Não cheguei a vomitar.' },
        { id: 'dispneia', tema: 'Dispneia', item: 'associados', kw: KW.dispneia, r: 'Estou com um pouco de falta de ar, sim.' },
        { id: 'sincope', tema: 'Síncope/palpitações', item: 'associados', kw: ['desmai', 'sincope', 'apag', 'perdeu a consciencia', 'palpita', 'coracao acelerado', 'tontura', 'tonto'], r: 'Não desmaiei. Senti o coração um pouco acelerado.' },
        { id: 'previos', tema: 'Episódios prévios', item: 'previos', kw: ['antes', 'outras vezes', 'outra vez', 'ja sentiu', 'ja teve', 'primeira vez', 'episodio', 'semanas', 'ultimos dias', 'ja aconteceu'], r: 'Nas últimas semanas eu sentia um aperto mais fraco quando fazia esforço, mas passava quando eu parava. Achei que era cansaço.' },
        { id: 'comorbidades', tema: 'Comorbidades', item: 'fr', kw: ['doenca', 'comorbidade', 'problema de saude', 'pressao alta', 'hipertens', 'diabet', 'acucar no sangue', 'colesterol', 'gordura no sangue', 'problema no coracao', 'rins', 'figado', 'tireoide'], r: 'Tenho pressão alta e diabetes há uns 10 anos. O colesterol também é alto, mas não tomo remédio para isso.' },
        { id: 'medicacoes', tema: 'Medicações', item: 'medicacoes', kw: ['remedio', 'medicamento', 'medicacao', 'medicacoes', 'toma algum', 'usa algum', 'faz uso de algum', 'tomando algo', 'tomou algo', 'tomou alguma'], r: 'Tomo losartana e metformina... mas às vezes esqueço. Não tomei nada para a dor.' },
        { id: 'tabagismo', tema: 'Tabagismo', item: 'fr', kw: ['fuma', 'fumo', 'fumante', 'fumou', 'cigarro', 'tabag'], r: 'Fumo desde os 18 anos, um maço por dia.' },
        { id: 'familia', tema: 'História familiar', item: 'fr', kw: ['famili', 'pai ', 'mae ', 'irmao', 'irma ', 'parentes', 'hereditar'], r: 'Meu pai morreu de infarto com 60 anos.' },
        { id: 'sedentarismo', tema: 'Atividade física', kw: ['atividade fisica', 'exercicio', 'academia', 'caminha', 'sedentar', 'esporte'], r: 'Exercício? Não faço nada, doutor(a). Fico o dia todo sentado no ônibus.' },
        { id: 'contraind', tema: 'Sangramentos/AVC/cirurgia recente', item: 'contraind', kw: ['sangr', 'hemorrag', 'avc', 'derrame', 'cirurgia', 'operou', 'operad', 'ulcera', 'trauma', 'pancada', 'machuc', 'coagul'], r: 'Nunca tive derrame nem sangramento. Não fiz cirurgia e não me machuquei.' },
        { id: 'drogas', tema: 'Drogas/sildenafil', kw: ['droga', 'cocaina', 'crack', 'maconha', 'viagra', 'sildenafil', 'tadalafil', 'disfuncao eretil', 'remedio para ereca'], r: 'Não uso droga nenhuma. Também não tomo esses remédios de ereção.' },
        { id: 'alergias', tema: 'Alergias', item: 'alergias', kw: ['alergi', 'alergic', 'alergia a algum', 'alergia a remedio', 'alergia a medicamento', 'alergia a alguma medicacao', 'alergico a', 'alergica a'], r: 'Não tenho alergia a remédio nenhum.' }
      ],
      exameFisico: [
        { id: 'sv', nome: 'Sinais vitais completos', item: 'ef_sv', r: 'PA 150x95 mmHg (MSD) e 148x94 mmHg (MSE); FC 98 bpm; FR 20 irpm; SatO₂ 95% em ar ambiente; Tax 36,5 °C.' },
        { id: 'geral', nome: 'Ectoscopia / estado geral', r: 'Ansioso, sudoreico, corado, hidratado, acianótico, anictérico. Lúcido e orientado.' },
        { id: 'pescoco', nome: 'Pescoço (turgência jugular)', r: 'Sem turgência jugular a 45°. Carótidas sem sopros.' },
        { id: 'ac', nome: 'Ausculta cardíaca', item: 'ef_cv', r: 'Ritmo cardíaco regular em 2 tempos, bulhas normofonéticas, presença de B4. Sem sopros ou atrito pericárdico.' },
        { id: 'ap', nome: 'Ausculta pulmonar', item: 'ef_pulm', r: 'Murmúrio vesicular presente bilateralmente, sem ruídos adventícios (Killip I).' },
        { id: 'pulsos', nome: 'Pulsos periféricos', item: 'ef_pulsos', r: 'Pulsos radiais, femorais e pediosos presentes e simétricos.' },
        { id: 'abdome', nome: 'Exame do abdome', r: 'Plano, flácido, indolor, sem visceromegalias.' },
        { id: 'mmii', nome: 'Membros inferiores', r: 'Sem edema, panturrilhas livres.' },
        { id: 'glicemia', nome: 'Glicemia capilar', r: '182 mg/dL.' }
      ],
      exames: [
        { id: 'ecg', nome: 'Eletrocardiograma (12 derivações)', grupo: 'Outros', item: 'ecg', r: 'Ritmo sinusal, FC 98 bpm. Supradesnivelamento do segmento ST de 3 mm em V1 a V4, com infradesnivelamento recíproco em DII, DIII e aVF.' },
        { id: 'trop', nome: 'Troponina ultrassensível', grupo: 'Laboratório', item: 'trop', r: 'Troponina I us: 85 ng/L (VR < 34 ng/L).' },
        { id: 'ckmb', nome: 'CK-MB', grupo: 'Laboratório', r: 'CK-MB massa: 9 ng/mL (VR < 5).' },
        { id: 'hemo', nome: 'Hemograma', grupo: 'Laboratório', item: 'labs', r: 'Hb 14,5 g/dL; leucócitos 9.800/mm³; plaquetas 245.000/mm³.' },
        { id: 'eletro', nome: 'Ureia, creatinina, sódio e potássio', grupo: 'Laboratório', item: 'labs', r: 'Ureia 38 mg/dL; creatinina 1,0 mg/dL; Na 139 mEq/L; K 4,2 mEq/L.' },
        { id: 'coag', nome: 'Coagulograma', grupo: 'Laboratório', item: 'labs', r: 'TP/INR 1,0; TTPa 30 s.' },
        { id: 'ddimero', nome: 'D-dímero', grupo: 'Laboratório', r: '420 ng/mL (VR < 500).' },
        { id: 'rx', nome: 'Radiografia de tórax', grupo: 'Imagem', r: 'Área cardíaca normal, sem congestão pulmonar, sem alargamento de mediastino.' },
        { id: 'eco', nome: 'Ecocardiograma', grupo: 'Imagem', r: 'Não disponível na UPA no momento. (Não deve atrasar a reperfusão.)' },
        { id: 'angiotc', nome: 'Angiotomografia de tórax', grupo: 'Imagem', r: 'Não realizada: exame não indicado neste momento e atrasaria a reperfusão.' }
      ],
      checklist: {
        anamnese: [
          { id: 'local', texto: 'Pergunta a localização da dor', pts: 1 },
          { id: 'inicio', texto: 'Pergunta início/tempo de dor e circunstância (esforço)', pts: 1 },
          { id: 'carater', texto: 'Caracteriza o tipo da dor', pts: 1 },
          { id: 'intensidade', texto: 'Pergunta a intensidade', pts: 1 },
          { id: 'irradiacao', texto: 'Pergunta sobre irradiação', pts: 1 },
          { id: 'fatores', texto: 'Pergunta fatores de melhora/piora', pts: 1 },
          { id: 'associados', texto: 'Investiga sintomas associados (sudorese, náuseas, dispneia, síncope)', pts: 1 },
          { id: 'previos', texto: 'Pergunta sobre episódios prévios', pts: 1 },
          { id: 'fr', texto: 'Investiga fatores de risco cardiovascular (HAS, DM, dislipidemia, tabagismo, história familiar)', pts: 2 },
          { id: 'medicacoes', texto: 'Pergunta medicações em uso', pts: 1 },
          { id: 'alergias', texto: 'Pergunta sobre alergias', pts: 1 },
          { id: 'contraind', texto: 'Pesquisa contraindicações a antitrombóticos/trombólise (sangramento, AVC, cirurgia recente)', pts: 1 }
        ],
        exame: [
          { id: 'ef_sv', texto: 'Avalia sinais vitais (PA nos dois membros superiores)', pts: 1 },
          { id: 'ef_cv', texto: 'Realiza ausculta cardíaca', pts: 1 },
          { id: 'ef_pulm', texto: 'Realiza ausculta pulmonar (classificação de Killip)', pts: 1 },
          { id: 'ef_pulsos', texto: 'Avalia pulsos periféricos (diferencial com dissecção de aorta)', pts: 1 }
        ],
        exames: [
          { id: 'ecg', texto: 'Solicita ECG de 12 derivações (meta: até 10 min da chegada)', pts: 2 },
          { id: 'trop', texto: 'Solicita marcador de necrose miocárdica (troponina)', pts: 1 },
          { id: 'labs', texto: 'Solicita exames gerais (hemograma, função renal, eletrólitos, coagulograma)', pts: 1 }
        ]
      },
      diagnostico: {
        pts: 2, correta: 0,
        opcoes: [
          'Infarto agudo do miocárdio com supradesnivelamento do segmento ST (parede anterior)',
          'Angina instável',
          'Dissecção aguda de aorta',
          'Tromboembolismo pulmonar',
          'Pericardite aguda'
        ]
      },
      conduta: [
        { texto: 'AAS 150–300 mg mastigado (dose de ataque)', correta: true },
        { texto: 'Segundo antiagregante: clopidogrel em dose de ataque', correta: true },
        { texto: 'Anticoagulação (enoxaparina ou heparina não fracionada)', correta: true },
        { texto: 'Reperfusão imediata: angioplastia primária (porta-balão ≤ 90–120 min) ou fibrinólise (porta-agulha ≤ 30 min) se ICP indisponível em tempo hábil', correta: true, pts: 2 },
        { texto: 'Estatina de alta potência (ex.: atorvastatina 80 mg)', correta: true },
        { texto: 'Nitrato sublingual para controle da dor, se não houver contraindicação', correta: true },
        { texto: 'Oxigênio suplementar de rotina, mesmo com SatO₂ ≥ 90%', correta: false },
        { texto: 'Aguardar o resultado da segunda troponina antes de decidir a reperfusão', correta: false },
        { texto: 'Solicitar teste ergométrico ainda hoje', correta: false },
        { texto: 'Alta com analgésico e encaminhamento ao cardiologista', correta: false }
      ],
      comentarios: [
        'Dor torácica típica + supra de ST ≥ 2 mm em derivações contíguas (V1–V4) = IAM com supra de ST de parede anterior. O diagnóstico é eletrocardiográfico: não se espera troponina para indicar reperfusão.',
        'O ECG deve ser feito e interpretado em até 10 minutos da chegada do paciente.',
        'Tempo é miocárdio: angioplastia primária é a reperfusão de escolha se disponível em até 120 min; caso contrário, fibrinólise em até 30 min, na ausência de contraindicações (por isso perguntar sobre sangramentos, AVC e cirurgias).',
        'O₂ só se SatO₂ < 90%. Nitrato é contraindicado se uso de inibidor de fosfodiesterase nas últimas 24–48 h, hipotensão ou suspeita de infarto de VD.',
        'Avaliar pulsos e PA nos dois braços ajuda a afastar dissecção de aorta antes de anticoagular.'
      ]
    },

    // ------------------------------------------------------------------ 2
    {
      id: 'apendicite',
      titulo: 'Dor abdominal aguda',
      area: 'Cirurgia Geral',
      nivel: 'Básico',
      duracao: 10,
      local: 'Pronto-socorro',
      paciente: { nome: 'Lucas Andrade', idade: 22, sexo: 'M', avatar: '👨🏽', profissao: 'Sou estudante de engenharia.' },
      cenario: 'Você atende no pronto-socorro de um hospital geral. Lucas, 22 anos, procura atendimento por dor abdominal. Triagem: PA 120x80 mmHg, FC 104 bpm, FR 18 irpm, SatO₂ 98%, Tax 38,1 °C.',
      tarefas: [
        'Realize anamnese dirigida.',
        'Realize o exame físico abdominal pertinente.',
        'Solicite os exames complementares necessários.',
        'Defina hipótese diagnóstica e conduta, explicando ao paciente.'
      ],
      abertura: 'Doutor(a), tô com muita dor na barriga desde ontem, não aguento mais...',
      reacaoExplicacao: 'Cirurgia? Sério? Eu nunca operei nada... Mas se precisa, tudo bem. É perigoso?',
      falas: [
        { id: 'local', tema: 'Localização atual', item: 'local', kw: KW.local, r: 'Agora a dor está aqui embaixo, do lado direito (aponta para a fossa ilíaca direita).' },
        { id: 'migracao', tema: 'Migração da dor', item: 'migracao', kw: ['onde a dor comecou', 'onde comecou', 'comecou onde', 'comecou em que', 'em que lugar comecou', 'onde iniciou', 'no comeco', 'no inicio', 'mudou de lugar', 'mudou de local', 'mudou de posicao', 'migr', 'antes era', 'sempre foi', 'sempre doeu', 'se moveu', 'mesmo lugar', 'umbigo'], r: 'No começo era em volta do umbigo, meio espalhada. Depois de algumas horas foi descendo para o lado direito.' },
        { id: 'inicio', tema: 'Início', item: 'inicio', kw: KW.inicio, r: 'Começou ontem à noite, faz umas 20 horas.' },
        { id: 'carater', tema: 'Característica', item: 'carater', kw: KW.carater, r: 'É uma dor contínua, que vem piorando. Não é cólica, é constante.' },
        { id: 'intensidade', tema: 'Intensidade', item: 'carater', kw: KW.intensidade, r: 'Agora está nota 8.' },
        { id: 'irradiacao', tema: 'Irradiação', kw: KW.irradiacao, r: 'Não vai para as costas nem para a virilha. Fica ali do lado direito.' },
        { id: 'fatores', tema: 'Fatores de piora', item: 'fatores', kw: k(KW.fatores, ['andar', 'tossir', 'mexer', 'movimento']), r: 'Piora quando eu ando, tusso ou o carro passa em buraco. Fico melhor deitado quietinho.' },
        { id: 'nausea', tema: 'Náuseas e vômitos', item: 'associados', kw: k(KW.nausea, ['outro sintoma', 'outros sintomas']), r: 'Tive enjoo e vomitei duas vezes ontem à noite, depois que a dor começou.' },
        { id: 'apetite', tema: 'Apetite', item: 'associados', kw: ['apetite', 'fome', 'comer', 'alimenta', 'inapetencia', 'anorexia'], r: 'Não tenho fome nenhuma desde ontem.' },
        { id: 'jejum', tema: 'Última refeição', item: 'jejum', kw: ['ultima refeicao', 'ultima vez que comeu', 'que horas comeu', 'quando comeu', 'jejum', 'comeu pela ultima', 'ultima alimentacao', 'comeu alguma coisa', 'comeu algo'], r: 'A última vez que comi foi ontem no almoço. Depois disso só tomei uns goles de água.' },
        { id: 'febre', tema: 'Febre', item: 'febre', kw: KW.febre, r: 'Estou me sentindo quente desde hoje cedo. Não medi, mas acho que é febre.' },
        { id: 'intestino', tema: 'Hábito intestinal', item: 'tgi', kw: ['evacu', 'intestino', 'fezes', 'coco', 'diarreia', 'prisao de ventre', 'constipa', 'gases', 'flatos', 'sangue nas fezes'], r: 'Não evacuei desde ontem. Não tive diarreia nem sangue nas fezes.' },
        { id: 'urina', tema: 'Sintomas urinários', item: 'urinario', kw: ['urina', 'xixi', 'mijar', 'ardencia', 'arde', 'disuria', 'sangue na urina', 'urinar'], r: 'O xixi está normal. Sem ardência e sem sangue.' },
        { id: 'previos', tema: 'Episódios prévios', kw: ['antes', 'outras vezes', 'ja sentiu', 'ja teve', 'primeira vez', 'ja aconteceu'], r: 'Nunca tive uma dor assim antes.' },
        { id: 'medicacoes', tema: 'Medicações', kw: ['remedio', 'medicamento', 'medicacao', 'toma algum', 'usa algum', 'tomou algo', 'tomou alguma', 'analges', 'dipirona'], r: 'Tomei uma dipirona ontem à noite, quase não adiantou.' },
        { id: 'cirurgias', tema: 'Cirurgias prévias', item: 'antecedentes', kw: ['cirurgia', 'operou', 'operad', 'operacao', 'internad', 'internacao'], r: 'Nunca fiz cirurgia nem fiquei internado.' },
        { id: 'comorbidades', tema: 'Comorbidades', item: 'antecedentes', kw: ['doenca', 'comorbidade', 'problema de saude', 'pressao alta', 'hipertens', 'diabet', 'saudavel'], r: 'Não tenho nenhuma doença.' },
        { id: 'alergias', tema: 'Alergias', item: 'alergias', kw: ['alergi', 'alergic', 'alergia a algum', 'alergia a remedio', 'alergia a medicamento', 'alergia a alguma medicacao', 'alergico a', 'alergica a'], r: 'Não tenho alergia a nada.' },
        { id: 'sexual', tema: 'Vida sexual', kw: ['sexual', 'relacao', 'parceir', 'namorad', 'camisinha', 'preservativo', 'corrimento', 'testiculo', 'saco'], r: 'Tenho namorada, a gente usa camisinha. Não tenho corrimento nem dor nos testículos.' }
      ],
      exameFisico: [
        { id: 'sv', nome: 'Sinais vitais', r: 'PA 120x80 mmHg; FC 104 bpm; FR 18 irpm; SatO₂ 98%; Tax 38,1 °C.' },
        { id: 'geral', nome: 'Ectoscopia / estado geral', r: 'Regular estado geral, fácies de dor, desidratado +/4+. Deambula com dificuldade, levemente fletido para a direita.' },
        { id: 'insp', nome: 'Inspeção abdominal', item: 'ef_insp', r: 'Abdome plano, sem cicatrizes, abaulamentos ou hérnias.' },
        { id: 'ausc', nome: 'Ausculta abdominal', item: 'ef_insp', r: 'Ruídos hidroaéreos diminuídos.' },
        { id: 'perc', nome: 'Percussão abdominal', r: 'Timpanismo preservado; dor à percussão em fossa ilíaca direita.' },
        { id: 'palp', nome: 'Palpação superficial e profunda', item: 'ef_palp', r: 'Dor à palpação em fossa ilíaca direita, com defesa voluntária localizada. Ponto de McBurney doloroso. Sem massas palpáveis.' },
        { id: 'blumberg', nome: 'Sinal de Blumberg', item: 'ef_sinais', r: 'Positivo: dor intensa à descompressão brusca no ponto de McBurney.' },
        { id: 'rovsing', nome: 'Sinal de Rovsing', item: 'ef_sinais', r: 'Positivo: a compressão da fossa ilíaca esquerda provoca dor na fossa ilíaca direita.' },
        { id: 'psoas', nome: 'Sinal do psoas', item: 'ef_sinais', r: 'Positivo: dor à extensão passiva da coxa direita.' },
        { id: 'obturador', nome: 'Sinal do obturador', r: 'Negativo.' },
        { id: 'giordano', nome: 'Punho-percussão lombar (Giordano)', r: 'Negativa bilateralmente.' },
        { id: 'toque', nome: 'Toque retal', r: 'Dor à palpação do fundo de saco à direita. Sem massas ou sangue em dedo de luva.' },
        { id: 'genital', nome: 'Exame da genitália / testículos', r: 'Testículos tópicos, indolores, sem alterações.' },
        { id: 'cardiopulm', nome: 'Ausculta cardiopulmonar', r: 'Taquicárdico, ritmo regular, sem sopros. MV presente sem ruídos adventícios.' }
      ],
      exames: [
        { id: 'hemo', nome: 'Hemograma', grupo: 'Laboratório', item: 'lab', r: 'Hb 14,8 g/dL; leucócitos 15.800/mm³ (85% neutrófilos, 6% bastões); plaquetas 280.000/mm³.' },
        { id: 'pcr', nome: 'Proteína C reativa', grupo: 'Laboratório', item: 'lab', r: 'PCR 68 mg/L (VR < 5).' },
        { id: 'eas', nome: 'Urina tipo I (EAS)', grupo: 'Laboratório', item: 'eas', r: 'Sem leucocitúria, sem hematúria, nitrito negativo.' },
        { id: 'amilase', nome: 'Amilase e lipase', grupo: 'Laboratório', r: 'Amilase 62 U/L; lipase 30 U/L (normais).' },
        { id: 'funcao', nome: 'Ureia, creatinina e eletrólitos', grupo: 'Laboratório', r: 'Ureia 30 mg/dL; creatinina 0,9 mg/dL; Na 138; K 3,9 mEq/L.' },
        { id: 'coag', nome: 'Coagulograma', grupo: 'Laboratório', r: 'TP/INR 1,0; TTPa 29 s.' },
        { id: 'bhcg', nome: 'Beta-hCG', grupo: 'Laboratório', r: 'Não se aplica: paciente do sexo masculino.' },
        { id: 'usg', nome: 'Ultrassonografia de abdome', grupo: 'Imagem', item: 'imagem', r: 'Apêndice não compressível com 10 mm de diâmetro, com borramento da gordura periapendicular. Sem coleções.' },
        { id: 'tc', nome: 'Tomografia de abdome com contraste', grupo: 'Imagem', item: 'imagem', r: 'Apêndice espessado (11 mm) com densificação da gordura periapendicular. Sem abscesso, sem pneumoperitônio.' },
        { id: 'rxabd', nome: 'Radiografia de abdome agudo', grupo: 'Imagem', r: 'Sem pneumoperitônio. Distribuição gasosa inespecífica. Possível fecalito em fossa ilíaca direita.' }
      ],
      checklist: {
        anamnese: [
          { id: 'inicio', texto: 'Pergunta o tempo de início da dor', pts: 1 },
          { id: 'local', texto: 'Pergunta a localização atual da dor', pts: 1 },
          { id: 'migracao', texto: 'Caracteriza a migração da dor (periumbilical → fossa ilíaca direita)', pts: 2 },
          { id: 'carater', texto: 'Caracteriza tipo e intensidade da dor', pts: 1 },
          { id: 'fatores', texto: 'Pergunta fatores de melhora/piora', pts: 1 },
          { id: 'associados', texto: 'Pergunta náuseas/vômitos e anorexia', pts: 1 },
          { id: 'febre', texto: 'Pergunta sobre febre', pts: 1 },
          { id: 'tgi', texto: 'Pergunta hábito intestinal', pts: 1 },
          { id: 'urinario', texto: 'Pergunta sintomas urinários (diagnóstico diferencial)', pts: 1 },
          { id: 'jejum', texto: 'Pergunta horário da última refeição (jejum pré-operatório)', pts: 1 },
          { id: 'antecedentes', texto: 'Pergunta antecedentes (comorbidades, cirurgias prévias)', pts: 1 },
          { id: 'alergias', texto: 'Pergunta sobre alergias', pts: 1 }
        ],
        exame: [
          { id: 'ef_insp', texto: 'Realiza inspeção e ausculta abdominal', pts: 1 },
          { id: 'ef_palp', texto: 'Realiza palpação abdominal superficial e profunda', pts: 1 },
          { id: 'ef_sinais', texto: 'Pesquisa sinais de apendicite/irritação peritoneal (Blumberg, Rovsing, psoas)', pts: 2 }
        ],
        exames: [
          { id: 'lab', texto: 'Solicita hemograma e/ou PCR', pts: 1 },
          { id: 'eas', texto: 'Solicita urina tipo I (diferencial com causas urinárias)', pts: 1 },
          { id: 'imagem', texto: 'Solicita exame de imagem (USG ou TC de abdome)', pts: 1 }
        ]
      },
      diagnostico: {
        pts: 2, correta: 0,
        opcoes: ['Apendicite aguda', 'Cólica nefrética à direita', 'Diverticulite aguda', 'Gastroenterite aguda', 'Colecistite aguda']
      },
      conduta: [
        { texto: 'Jejum e hidratação venosa', correta: true },
        { texto: 'Analgesia adequada (inclusive opioide se necessário)', correta: true },
        { texto: 'Antibioticoprofilaxia (ex.: cefazolina + metronidazol ou ceftriaxona + metronidazol)', correta: true },
        { texto: 'Avaliação da cirurgia geral para apendicectomia (preferencialmente videolaparoscópica)', correta: true, pts: 2 },
        { texto: 'Suspender analgesia até a avaliação do cirurgião para não mascarar o quadro', correta: false },
        { texto: 'Alta com antiespasmódico e retorno se piorar', correta: false },
        { texto: 'Colonoscopia de urgência', correta: false },
        { texto: 'Dieta leve e reavaliação em 48 horas', correta: false }
      ],
      comentarios: [
        'Quadro clássico: dor periumbilical que migra para fossa ilíaca direita, anorexia, náuseas/vômitos após a dor, febre baixa, leucocitose com desvio.',
        'Escore de Alvarado deste paciente: migração (1) + anorexia (1) + náuseas (1) + dor em FID (2) + descompressão dolorosa (1) + febre (1) + leucocitose (2) + desvio (1) = 10 → alta probabilidade.',
        'Analgesia NÃO mascara o diagnóstico e não deve ser postergada.',
        'Perguntar a última refeição é essencial para o planejamento anestésico.',
        'Em mulheres em idade fértil, sempre solicitar beta-hCG e considerar causas ginecológicas.'
      ]
    },

    // ------------------------------------------------------------------ 3
    {
      id: 'pneumonia',
      titulo: 'Tosse e febre na idosa',
      area: 'Clínica Médica · Pneumologia',
      nivel: 'Intermediário',
      duracao: 10,
      local: 'Pronto atendimento',
      paciente: { nome: 'Maria Aparecida Souza', idade: 67, sexo: 'F', avatar: '👵🏼', profissao: 'Sou aposentada, era costureira.' },
      cenario: 'Maria Aparecida, 67 anos, procura o pronto atendimento com tosse e febre. Triagem: PA 110x70 mmHg, FC 108 bpm, FR 26 irpm, SatO₂ 91% em ar ambiente, Tax 38,6 °C.',
      tarefas: [
        'Realize anamnese dirigida.',
        'Realize exame físico do aparelho respiratório.',
        'Solicite exames complementares.',
        'Estratifique a gravidade, defina diagnóstico, local de tratamento e conduta.'
      ],
      abertura: 'Ai, doutor(a)... tô com uma tosse e um cansaço que não passam, e uma febre que vai e volta.',
      reacaoExplicacao: 'Pneumonia? Vou ter que ficar internada? Ai, meu Deus... mas se for melhor pra mim, tudo bem.',
      falas: [
        { id: 'inicio', tema: 'Início', item: 'inicio', kw: KW.inicio, r: 'Começou há 4 dias e foi piorando.' },
        { id: 'tosse', tema: 'Características da tosse', item: 'tosse', kw: ['tosse', 'catarro', 'secrecao', 'escarro', 'expector', 'cor do', 'pigarro', 'seca'], r: 'Tosse com bastante catarro amarelo-esverdeado.' },
        { id: 'hemoptise', tema: 'Hemoptise', item: 'tosse', kw: ['sangue', 'hemoptise', 'sangrando'], r: 'Não vi sangue no catarro, não.' },
        { id: 'febre', tema: 'Febre', item: 'febre', kw: KW.febre, r: 'Febre de 38,5 desde anteontem, com calafrio.' },
        { id: 'dispneia', tema: 'Dispneia', item: 'dispneia', kw: KW.dispneia, r: 'Fico cansada só de ir até o banheiro. Antes eu caminhava normal.' },
        { id: 'dor', tema: 'Dor torácica', item: 'dor', kw: ['dor', 'doi', 'peito', 'pontada', 'torax'], r: 'Dói do lado direito do peito quando eu respiro fundo ou tusso.' },
        { id: 'confusao', tema: 'Estado mental', item: 'gravidade', kw: ['confus', 'desorient', 'sonolen', 'esquec', 'sabe onde', 'que dia', 'lucid'], r: 'Estou bem da cabeça, sei onde estou. Hoje é quinta-feira.' },
        { id: 'diurese', tema: 'Diurese/hidratação', item: 'gravidade', kw: ['xixi', 'urina', 'diurese', 'bebendo agua', 'liquido'], r: 'Estou fazendo pouco xixi, quase não bebi água esses dias.' },
        { id: 'apetite', tema: 'Apetite', kw: ['apetite', 'fome', 'comer', 'alimenta'], r: 'Não tenho vontade de comer nada.' },
        { id: 'tb', tema: 'Sintomas de tuberculose', item: 'tb', kw: ['emagrec', 'perda de peso', 'perdeu peso', 'suor', 'sudorese', 'tuberculose', 'contato', 'contactante', 'alguem doente', 'alguem em casa', 'tosse ha mais de'], r: 'Não perdi peso nem suo à noite. Ninguém em casa teve tuberculose. Antes desses 4 dias eu não tossia.' },
        { id: 'comorbidades', tema: 'Comorbidades', item: 'comorb', kw: ['doenca', 'comorbidade', 'problema de saude', 'pressao alta', 'hipertens', 'diabet', 'acucar no sangue', 'coracao', 'rins', 'figado', 'asma', 'bronquite', 'dpoc', 'enfisema', 'pulmao'], r: 'Tenho pressão alta e diabetes. Do pulmão nunca tive nada, nem bronquite.' },
        { id: 'medicacoes', tema: 'Medicações', kw: ['remedio', 'medicamento', 'medicacao', 'toma algum', 'usa algum', 'tomando algo', 'tomou algo', 'tomou alguma'], r: 'Tomo losartana e metformina. Para a febre tomei dipirona.' },
        { id: 'atb', tema: 'Antibiótico/internação recente', item: 'atb_previo', kw: ['antibiotico', 'internad', 'internacao', 'hospital', 'ultimos meses', 'ultimos 3 meses', 'amoxicilina', 'azitromicina'], r: 'Não fui internada nem tomei antibiótico nos últimos meses.' },
        { id: 'vacina', tema: 'Vacinação', item: 'vacina', kw: ['vacina', 'imuniz', 'gripe', 'pneumococ', 'influenza'], r: 'Tomei a da gripe esse ano. A da pneumonia eu nunca tomei.' },
        { id: 'tabagismo', tema: 'Tabagismo', item: 'tabag', kw: ['fuma', 'fumo', 'fumante', 'fumou', 'cigarro', 'tabag'], r: 'Fumei por 30 anos, parei faz 10.' },
        { id: 'alergias', tema: 'Alergias', item: 'alergias', kw: ['alergi', 'alergic', 'alergia a algum', 'alergia a remedio', 'alergia a medicamento', 'alergia a alguma medicacao', 'alergico a', 'alergica a'], r: 'Não tenho alergia a nenhum remédio.' },
        { id: 'aspiracao', tema: 'Engasgos', kw: ['engasg', 'engol', 'aspira'], r: 'Não tenho engasgado, não.' }
      ],
      exameFisico: [
        { id: 'sv', nome: 'Sinais vitais', item: 'ef_sv', r: 'PA 110x70 mmHg; FC 108 bpm; FR 26 irpm; SatO₂ 91% em ar ambiente; Tax 38,6 °C.' },
        { id: 'geral', nome: 'Ectoscopia / estado geral', item: 'ef_sv', r: 'Regular estado geral, dispneica, corada, desidratada +/4+. Lúcida e orientada (Glasgow 15).' },
        { id: 'insp', nome: 'Inspeção e expansibilidade torácica', item: 'ef_insp', r: 'Tiragem intercostal discreta; expansibilidade reduzida à direita.' },
        { id: 'ftv', nome: 'Frêmito toracovocal', item: 'ef_insp', r: 'Aumentado em base direita.' },
        { id: 'perc', nome: 'Percussão do tórax', item: 'ef_insp', r: 'Macicez em base direita.' },
        { id: 'ap', nome: 'Ausculta pulmonar', item: 'ef_ausc', r: 'Murmúrio vesicular diminuído em base direita, com estertores crepitantes em terço inferior do hemitórax direito. Broncofonia aumentada nessa região.' },
        { id: 'ac', nome: 'Ausculta cardíaca', r: 'Taquicárdica, ritmo regular em 2 tempos, sem sopros.' },
        { id: 'mmii', nome: 'Membros inferiores', r: 'Sem edema, panturrilhas livres.' },
        { id: 'glicemia', nome: 'Glicemia capilar', r: '210 mg/dL.' }
      ],
      exames: [
        { id: 'rx', nome: 'Radiografia de tórax (PA e perfil)', grupo: 'Imagem', item: 'rx', r: 'Consolidação em lobo inferior direito com broncograma aéreo. Sem derrame pleural significativo.' },
        { id: 'hemo', nome: 'Hemograma', grupo: 'Laboratório', item: 'lab', r: 'Hb 12,8 g/dL; leucócitos 17.200/mm³ (88% neutrófilos); plaquetas 210.000/mm³.' },
        { id: 'ureia', nome: 'Ureia, creatinina e eletrólitos', grupo: 'Laboratório', item: 'ureia', r: 'Ureia 52 mg/dL; creatinina 1,2 mg/dL; Na 136; K 4,4 mEq/L.' },
        { id: 'pcr', nome: 'Proteína C reativa', grupo: 'Laboratório', item: 'lab', r: 'PCR 145 mg/L.' },
        { id: 'gaso', nome: 'Gasometria arterial + lactato', grupo: 'Laboratório', item: 'lab', r: 'pH 7,44; pO₂ 62 mmHg; pCO₂ 34 mmHg; HCO₃ 23 mEq/L; lactato 1,6 mmol/L.' },
        { id: 'hemocult', nome: 'Hemoculturas (2 amostras)', grupo: 'Laboratório', item: 'culturas', r: 'Coletadas. Resultado em 48–72 h.' },
        { id: 'escarro', nome: 'Gram e cultura de escarro', grupo: 'Laboratório', item: 'culturas', r: 'Gram: diplococos Gram-positivos. Cultura em andamento.' },
        { id: 'baar', nome: 'Pesquisa de BAAR / TRM-TB no escarro', grupo: 'Laboratório', r: 'TRM-TB não detectado.' },
        { id: 'viral', nome: 'Painel viral (influenza/COVID-19)', grupo: 'Laboratório', r: 'Não detectado.' },
        { id: 'tc', nome: 'Tomografia de tórax', grupo: 'Imagem', r: 'Consolidação em lobo inferior direito, sem cavitações ou derrame. (Não necessária neste caso.)' },
        { id: 'ddimero', nome: 'D-dímero', grupo: 'Laboratório', r: '890 ng/mL (inespecífico no contexto infeccioso).' }
      ],
      checklist: {
        anamnese: [
          { id: 'inicio', texto: 'Pergunta tempo de evolução', pts: 1 },
          { id: 'tosse', texto: 'Caracteriza tosse e expectoração (inclui hemoptise)', pts: 1 },
          { id: 'febre', texto: 'Pergunta sobre febre', pts: 1 },
          { id: 'dispneia', texto: 'Pergunta sobre dispneia', pts: 1 },
          { id: 'dor', texto: 'Pergunta sobre dor torácica (pleurítica)', pts: 1 },
          { id: 'gravidade', texto: 'Avalia sinais de gravidade (confusão mental, diurese)', pts: 1 },
          { id: 'tb', texto: 'Investiga diferencial com tuberculose (perda de peso, sudorese noturna, contatos)', pts: 1 },
          { id: 'comorb', texto: 'Pergunta comorbidades', pts: 1 },
          { id: 'atb_previo', texto: 'Pergunta uso de antibiótico/internação nos últimos 3 meses', pts: 1 },
          { id: 'tabag', texto: 'Pergunta sobre tabagismo', pts: 1 },
          { id: 'vacina', texto: 'Pergunta situação vacinal (influenza/pneumococo)', pts: 1 },
          { id: 'alergias', texto: 'Pergunta sobre alergias', pts: 1 }
        ],
        exame: [
          { id: 'ef_sv', texto: 'Avalia sinais vitais, estado geral e nível de consciência', pts: 1 },
          { id: 'ef_insp', texto: 'Realiza inspeção, palpação (FTV) e percussão do tórax', pts: 1 },
          { id: 'ef_ausc', texto: 'Realiza ausculta pulmonar', pts: 2 }
        ],
        exames: [
          { id: 'rx', texto: 'Solicita radiografia de tórax', pts: 2 },
          { id: 'ureia', texto: 'Solicita ureia (cálculo do CURB-65)', pts: 1 },
          { id: 'lab', texto: 'Solicita hemograma, PCR e/ou gasometria', pts: 1 },
          { id: 'culturas', texto: 'Solicita hemoculturas e/ou escarro (paciente que será internado)', pts: 1 }
        ]
      },
      diagnostico: {
        pts: 2, correta: 0,
        opcoes: [
          'Pneumonia adquirida na comunidade (CURB-65 = 2)',
          'Tuberculose pulmonar',
          'Tromboembolismo pulmonar',
          'Insuficiência cardíaca descompensada',
          'Exacerbação de DPOC'
        ]
      },
      conduta: [
        { texto: 'Internação hospitalar em enfermaria', correta: true, pts: 2 },
        { texto: 'Oxigênio suplementar para manter SatO₂ ≥ 92%', correta: true },
        { texto: 'Antibiótico EV: betalactâmico (ex.: ceftriaxona) + macrolídeo, ou quinolona respiratória', correta: true, pts: 2 },
        { texto: 'Hidratação venosa e antitérmico', correta: true },
        { texto: 'Tratamento ambulatorial com amoxicilina VO', correta: false },
        { texto: 'Aguardar resultado da cultura de escarro para iniciar antibiótico', correta: false },
        { texto: 'Iniciar esquema RIPE para tuberculose', correta: false },
        { texto: 'Intubação orotraqueal imediata', correta: false }
      ],
      comentarios: [
        'Síndrome de consolidação (macicez, FTV aumentado, crepitantes, broncofonia) + febre + tosse produtiva + consolidação na radiografia = PAC.',
        'CURB-65: Confusão (0) + Ureia > 50 mg/dL (1) + FR ≥ 30 (0) + PAS < 90 ou PAD ≤ 60 (0) + idade ≥ 65 (1) = 2 → internação em enfermaria.',
        'SatO₂ 91% e FR 26 também reforçam a necessidade de internação. Com CURB ≥ 3 ou critérios de PAC grave (ATS/IDSA), considerar UTI.',
        'Antibiótico deve ser iniciado precocemente (idealmente na primeira hora após o diagnóstico em casos graves) — culturas não devem atrasá-lo.',
        'Na alta: vacinação antipneumocócica e reforço da antigripal.'
      ]
    },

    // ------------------------------------------------------------------ 4
    {
      id: 'diarreia-pediatria',
      titulo: 'Diarreia aguda na criança',
      area: 'Pediatria',
      nivel: 'Básico',
      duracao: 10,
      local: 'Unidade Básica de Saúde',
      paciente: { nome: 'Pedro', idade: 2, sexo: 'M', avatar: '👩🏽‍🍼', acompanhante: 'Joana (mãe)', profissao: 'Eu (Joana) trabalho como auxiliar administrativa. O Pedro fica na creche.' },
      cenario: 'Você atende na UBS. Joana traz seu filho Pedro, 2 anos, com diarreia. Triagem: FC 140 bpm, FR 30 irpm, Tax 37,8 °C. Quem responde às perguntas é a mãe.',
      tarefas: [
        'Realize anamnese com a mãe.',
        'Avalie o estado de hidratação da criança.',
        'Classifique o quadro e defina o plano de tratamento.',
        'Oriente a mãe.'
      ],
      abertura: 'Doutor(a), o Pedro está com diarreia há 3 dias e hoje está mais caidinho. Estou muito preocupada.',
      reacaoExplicacao: 'Ah, então ele está desidratado... Mas dá para tratar aqui com o soro? Ele não vai precisar ficar internado?',
      falas: [
        { id: 'nome', tema: 'Identificação', item: 'identificacao', kw: ['seu nome', 'qual o nome', 'qual e o nome', 'como se chama', 'como a senhora se chama', 'como voce se chama', 'nome da senhora', 'nome dele', 'nome da crianca', 'nome do seu filho', 'nome completo', 'quem e a senhora', 'e a mae', 'e mae', 'parentesco'], r: 'Eu sou a Joana, mãe dele. Ele é o Pedro.' },
        { id: 'idade', tema: 'Idade', kw: ['idade', 'quantos anos', 'quantos meses', 'data de nascimento'], r: 'Ele tem 2 anos.' },
        { id: 'inicio', tema: 'Início', item: 'inicio', kw: KW.inicio, r: 'Começou há 3 dias.' },
        { id: 'diarreia', tema: 'Características da diarreia', item: 'diarreia', kw: ['quantas vezes', 'frequencia', 'por dia', 'consistencia', 'liquid', 'aguad', 'como e o coco', 'como sao as fezes', 'como e a diarreia', 'cor', 'cheiro', 'volume', 'evacua'], r: 'Umas 8 vezes por dia, bem líquida, amarelada, molhando toda a fralda.' },
        { id: 'sangue', tema: 'Sangue/muco nas fezes', item: 'sangue', kw: ['sangue', 'muco', 'catarro', 'pus', 'gosma'], r: 'Não vi sangue nem muco.' },
        { id: 'vomitos', tema: 'Vômitos', item: 'vomitos', kw: KW.nausea, r: 'Vomitou 3 vezes ontem. Hoje só uma vez, de manhã.' },
        { id: 'febre', tema: 'Febre', item: 'febre', kw: KW.febre, r: 'Teve febre de 38 ontem. Dei paracetamol e baixou.' },
        { id: 'diurese', tema: 'Diurese', item: 'diurese', kw: ['xixi', 'urina', 'diurese', 'fralda molhad', 'fralda seca', 'quantas fraldas', 'mijando'], r: 'Está fazendo pouco xixi. A fralda fica seca por bastante tempo, e o xixi está escuro.' },
        { id: 'sede', tema: 'Aceitação de líquidos/sede', item: 'sede', kw: ['sede', 'beber', 'bebe agua', 'bebendo', 'aceita agua', 'aceitando liquido', 'liquido', 'tomando agua', 'soro', 'hidrat'], r: 'Ele está com muita sede! Quando ofereço água ele bebe tudo rapidinho. Dei um pouco de soro caseiro.' },
        { id: 'alimentacao', tema: 'Alimentação', item: 'alimentacao', kw: ['come', 'comendo', 'alimenta', 'apetite', 'fome', 'mama', 'peito', 'leite', 'amament', 'dieta', 'comida'], r: 'Está comendo pouco, mas ainda mama no peito à noite e aceita água.' },
        { id: 'perigo', tema: 'Sinais gerais de perigo', item: 'perigo', kw: ['convuls', 'ataque', 'letarg', 'sonolen', 'molinho', 'muito mole', 'desmai', 'acordar', 'acorda', 'nao consegue beber', 'vomita tudo', 'inconsciente', 'irritad', 'chorando', 'comportamento', 'ativo'], r: 'Não teve convulsão. Está mais irritado e chorão, mas acorda normal e consegue beber.' },
        { id: 'epidem', tema: 'Dados epidemiológicos', item: 'epidem', kw: ['creche', 'escola', 'contato', 'alguem em casa', 'outras criancas', 'mais alguem', 'agua de casa', 'agua que', 'filtra', 'ferve', 'saneamento', 'esgoto', 'viagem', 'comida estragada'], r: 'Na creche teve outras crianças com diarreia. A água de casa é encanada, mas nem sempre eu filtro.' },
        { id: 'vacinas', tema: 'Vacinação', item: 'vacinas', kw: ['vacina', 'caderneta', 'carteirinha', 'rotavirus', 'imuniz'], r: 'As vacinas estão em dia, inclusive a do rotavírus. Trouxe a caderneta.' },
        { id: 'medicacoes', tema: 'Medicações', kw: ['remedio', 'medicamento', 'medicacao', 'deu algum', 'tomou algo', 'tomou alguma', 'antibiotico'], r: 'Só dei paracetamol para a febre e soro caseiro.' },
        { id: 'comorbidades', tema: 'Antecedentes', item: 'antecedentes', kw: ['doenca', 'comorbidade', 'problema de saude', 'internad', 'internacao', 'cirurgia', 'saudavel', 'nasceu', 'parto', 'gestacao', 'prematur', 'desenvolvimento', 'peso ao nascer'], r: 'Ele sempre foi saudável, nunca internou. Nasceu a termo, de parto normal, e se desenvolve bem.' },
        { id: 'alergias', tema: 'Alergias', kw: ['alergi', 'alergic', 'alergia a algum', 'alergia a remedio', 'alergia a medicamento', 'alergia a alguma medicacao', 'alergico a', 'alergica a'], r: 'Ele não tem alergia a nada.' },
        { id: 'tabagismo', tema: 'Tabagismo em casa', kw: ['fuma', 'fumo', 'fumante', 'cigarro'], r: 'Ninguém fuma em casa.' },
        { id: 'etilismo', tema: '—', kw: ['bebida alcoolica', 'alcool', 'cerveja'], r: 'Ele tem 2 anos, doutor(a)!' },
        { id: 'drogas', tema: '—', kw: ['droga', 'maconha', 'cocaina'], r: 'Hã? Ele tem 2 anos, doutor(a)...' },
        { id: 'familia', tema: 'Família', kw: ['famili', 'pai ', 'irmao', 'irma ', 'parentes', 'mora com'], r: 'Moramos eu, o pai dele e a irmã de 6 anos. Ninguém mais está com diarreia em casa.' }
      ],
      exameFisico: [
        { id: 'geral', nome: 'Estado geral / comportamento', item: 'ef_hidrat', r: 'Irritado, chorando, mas consolável no colo da mãe.' },
        { id: 'olhos', nome: 'Olhos e lágrimas', item: 'ef_hidrat', r: 'Olhos fundos. Chora sem lágrimas.' },
        { id: 'boca', nome: 'Mucosas', item: 'ef_hidrat', r: 'Boca e língua secas.' },
        { id: 'sede', nome: 'Oferecer líquido (avaliar sede)', item: 'ef_hidrat', r: 'Bebe avidamente, com sede, o soro oferecido.' },
        { id: 'prega', nome: 'Sinal da prega cutânea', item: 'ef_hidrat', r: 'A prega desaparece lentamente (menos de 2 segundos).' },
        { id: 'perfusao', nome: 'Pulso e enchimento capilar', item: 'ef_hidrat', r: 'Pulso cheio, FC 140 bpm. Enchimento capilar de 3 segundos.' },
        { id: 'peso', nome: 'Peso', item: 'ef_peso', r: 'Peso atual: 11,5 kg (peso registrado na caderneta há 1 mês: 12,2 kg).' },
        { id: 'sv', nome: 'Sinais vitais', r: 'FC 140 bpm; FR 30 irpm; Tax 37,8 °C; SatO₂ 98%.' },
        { id: 'abdome', nome: 'Exame do abdome', item: 'ef_abd', r: 'Abdome flácido, ruídos hidroaéreos aumentados, indolor, sem massas ou visceromegalias.' },
        { id: 'fontanela', nome: 'Fontanela', r: 'Fontanela anterior já fechada (normal aos 2 anos).' },
        { id: 'ap', nome: 'Ausculta cardiopulmonar', r: 'Sem alterações, exceto taquicardia.' },
        { id: 'neuro', nome: 'Avaliação neurológica / rigidez de nuca', r: 'Ativo e reativo, sem rigidez de nuca ou sinais meníngeos.' }
      ],
      exames: [
        { id: 'glicemia', nome: 'Glicemia capilar', grupo: 'Laboratório', r: '88 mg/dL.' },
        { id: 'eletro', nome: 'Sódio e potássio', grupo: 'Laboratório', r: 'Na 136 mEq/L; K 3,6 mEq/L. (Não necessários para desidratação leve a moderada.)' },
        { id: 'hemo', nome: 'Hemograma', grupo: 'Laboratório', r: 'Sem alterações significativas. (Não necessário neste caso.)' },
        { id: 'copro', nome: 'Coprocultura', grupo: 'Laboratório', r: 'Resultado em 3–5 dias. (Não indicada na diarreia aquosa sem sangue.)' },
        { id: 'epf', nome: 'Parasitológico de fezes', grupo: 'Laboratório', r: 'Resultado em 7 dias. (Não muda a conduta na diarreia aguda.)' },
        { id: 'eas', nome: 'Urina tipo I', grupo: 'Laboratório', r: 'Densidade 1.030; sem leucocitúria.' }
      ],
      checklist: {
        anamnese: [
          { id: 'inicio', texto: 'Pergunta a duração da diarreia', pts: 1 },
          { id: 'diarreia', texto: 'Caracteriza a diarreia (frequência e consistência)', pts: 1 },
          { id: 'sangue', texto: 'Pergunta sobre sangue/muco nas fezes (disenteria)', pts: 1 },
          { id: 'vomitos', texto: 'Pergunta sobre vômitos', pts: 1 },
          { id: 'febre', texto: 'Pergunta sobre febre', pts: 1 },
          { id: 'diurese', texto: 'Pergunta sobre diurese', pts: 1 },
          { id: 'sede', texto: 'Pergunta aceitação de líquidos/sede', pts: 1 },
          { id: 'alimentacao', texto: 'Pergunta sobre alimentação/aleitamento', pts: 1 },
          { id: 'perigo', texto: 'Pesquisa sinais gerais de perigo (convulsão, letargia, não consegue beber, vomita tudo)', pts: 2 },
          { id: 'epidem', texto: 'Investiga dados epidemiológicos (creche, água, contactantes)', pts: 1 },
          { id: 'vacinas', texto: 'Verifica a vacinação (rotavírus)', pts: 1 },
          { id: 'antecedentes', texto: 'Pergunta antecedentes da criança', pts: 1 }
        ],
        exame: [
          { id: 'ef_hidrat', texto: 'Avalia sinais de desidratação (estado geral, olhos, sede, prega, enchimento capilar)', pts: 2 },
          { id: 'ef_peso', texto: 'Pesa a criança', pts: 1 },
          { id: 'ef_abd', texto: 'Examina o abdome', pts: 1 }
        ],
        exames: []
      },
      diagnostico: {
        pts: 2, correta: 1,
        opcoes: [
          'Diarreia aguda sem desidratação (Plano A)',
          'Diarreia aguda com desidratação (Plano B)',
          'Diarreia aguda com desidratação grave (Plano C)',
          'Disenteria',
          'Diarreia persistente'
        ]
      },
      conduta: [
        { texto: 'Terapia de reidratação oral com SRO na unidade: 50–100 mL/kg em 4–6 horas', correta: true, pts: 2 },
        { texto: 'Reavaliar periodicamente; após reidratada, seguir Plano A em casa', correta: true },
        { texto: 'Suplementação de zinco por 10–14 dias', correta: true },
        { texto: 'Manter a alimentação habitual e o aleitamento materno após a reidratação', correta: true },
        { texto: 'Orientar sinais de alarme e retorno', correta: true },
        { texto: 'Hidratação venosa rápida imediata (Plano C)', correta: false },
        { texto: 'Antibiótico empírico (ex.: ciprofloxacino)', correta: false },
        { texto: 'Antidiarreico (ex.: loperamida)', correta: false },
        { texto: 'Suspender a alimentação por 24 horas', correta: false }
      ],
      comentarios: [
        'Classificação (MS/AIDPI): dois ou mais sinais entre irritação/inquietação, olhos fundos, bebe avidamente com sede e sinal da prega que desaparece lentamente = DESIDRATAÇÃO → Plano B.',
        'Desidratação grave (Plano C): letargia/inconsciência, não consegue beber ou bebe mal, prega desaparece muito lentamente (> 2 s), enchimento capilar > 5 s.',
        'A perda de 0,7 kg (~6% do peso) é compatível com desidratação moderada.',
        'Exames laboratoriais não são necessários na diarreia aguda aquosa com desidratação leve/moderada.',
        'Antibiótico só se disenteria com comprometimento do estado geral, cólera grave ou imunossupressão. Antidiarreicos são contraindicados em crianças.',
        'Zinco: 10 mg/dia para menores de 6 meses e 20 mg/dia para maiores, por 10–14 dias.'
      ]
    },

    // ------------------------------------------------------------------ 5
    {
      id: 'pre-eclampsia',
      titulo: 'Cefaleia na gestante',
      area: 'Ginecologia e Obstetrícia',
      nivel: 'Avançado',
      duracao: 10,
      local: 'Pronto-socorro obstétrico',
      paciente: { nome: 'Ana Paula Ribeiro', idade: 28, sexo: 'F', avatar: '🤰🏽', profissao: 'Sou professora de educação infantil.' },
      cenario: 'Ana Paula, 28 anos, primigesta, chega ao PS obstétrico com cefaleia. Traz o cartão de pré-natal. Triagem: PA 168x112 mmHg, FC 92 bpm, FR 18 irpm, Tax 36,6 °C.',
      tarefas: [
        'Realize anamnese dirigida.',
        'Realize o exame físico materno e obstétrico.',
        'Solicite exames para avaliação materna e fetal.',
        'Formule o diagnóstico e institua a conduta.'
      ],
      abertura: 'Doutor(a), estou com uma dor de cabeça muito forte desde hoje cedo, e estou vendo uns pontinhos brilhantes...',
      reacaoExplicacao: 'Pré-eclâmpsia? Eu já ouvi falar... O meu bebê vai ficar bem? Vai ter que nascer agora?',
      falas: [
        { id: 'ig', tema: 'Idade gestacional/paridade', item: 'obst', kw: ['semanas', 'idade gestacional', 'quantos meses', 'de quanto tempo', 'primeira gravidez', 'primeira gestacao', 'outros filhos', 'outras gestac', 'outra gravidez', 'gravidez anterior', 'filhos', 'aborto', 'paridade', 'dum', 'ultima menstrua'], r: 'Estou de 32 semanas. É a minha primeira gravidez, nunca tive aborto.' },
        { id: 'prenatal', tema: 'Pré-natal', item: 'prenatal', kw: ['pre natal', 'prenatal', 'consultas', 'acompanhamento', 'cartao', 'cartaozinho', 'como estava a pressao', 'pressao estava', 'ultima consulta'], r: 'Fiz 7 consultas de pré-natal. A pressão sempre foi normal, até a última consulta, há 2 semanas, que estava 130x80.' },
        { id: 'cefaleia', tema: 'Cefaleia', item: 'cefaleia', kw: k(KW.inicio, KW.carater, KW.intensidade, KW.local, ['cefaleia', 'dor de cabeca', 'cabeca']), r: 'É na cabeça toda, mais na testa e na nuca, latejando. Começou hoje de manhã, nota 8, e não passou com paracetamol.' },
        { id: 'visual', tema: 'Alterações visuais', item: 'iminencia', kw: ['visao', 'vista', 'enxerg', 'escotoma', 'pontinho', 'brilh', 'embac', 'turv', 'olhos', 'luz'], r: 'Estou vendo uns pontinhos brilhantes, e a vista está meio embaçada.' },
        { id: 'epigastralgia', tema: 'Epigastralgia', item: 'iminencia', kw: ['estomago', 'epigast', 'boca do estomago', 'dor na barriga', 'dor abdominal', 'barriga doi', 'costela', 'lado direito', 'outra dor', 'outro sintoma', 'outros sintomas'], r: 'Estou com uma dor aqui em cima da barriga, na boca do estômago, desde ontem.' },
        { id: 'nausea', tema: 'Náuseas/vômitos', kw: KW.nausea, r: 'Estou um pouco enjoada, mas não vomitei.' },
        { id: 'edema', tema: 'Edema', kw: ['inchaco', 'inchad', 'inchou', 'edema', 'aliança', 'alianca', 'pes'], r: 'Meus pés, mãos e rosto incharam muito essa semana. A aliança nem entra mais.' },
        { id: 'mf', tema: 'Movimentação fetal', item: 'vitalidade', kw: ['mexe', 'mexendo', 'movimen', 'bebe mex', 'chute', 'chutando', 'sente o bebe', 'sentindo o bebe'], r: 'O bebê está mexendo normal.' },
        { id: 'perdas', tema: 'Perdas vaginais/contrações', item: 'perdas', kw: ['perda', 'perdeu liquido', 'liquido', 'bolsa', 'sangr', 'corrimento', 'contracao', 'contracoes', 'barriga dura', 'endurec', 'dor de parto'], r: 'Não perdi líquido nem sangue. A barriga não está endurecendo.' },
        { id: 'convulsao', tema: 'Convulsão', kw: ['convuls', 'ataque', 'desmai', 'perdeu a consciencia', 'confus'], r: 'Não, nunca tive convulsão nem desmaio.' },
        { id: 'dispneia', tema: 'Dispneia', kw: KW.dispneia, r: 'Não estou com falta de ar.' },
        { id: 'diurese', tema: 'Diurese', kw: ['xixi', 'urina', 'diurese', 'urinando'], r: 'Acho que estou fazendo um pouco menos de xixi.' },
        { id: 'comorbidades', tema: 'Antecedentes pessoais', item: 'antecedentes', kw: ['doenca', 'comorbidade', 'problema de saude', 'pressao alta', 'hipertens', 'diabet', 'rins', 'lupus', 'tireoide', 'antes da gravidez', 'antes da gestacao'], r: 'Antes da gravidez nunca tive pressão alta, diabetes nem problema nos rins.' },
        { id: 'medicacoes', tema: 'Medicações', kw: ['remedio', 'medicamento', 'medicacao', 'toma algum', 'usa algum', 'tomando algo', 'tomou algo', 'tomou alguma', 'vitamina', 'aas', 'aspirina'], r: 'Só sulfato ferroso e ácido fólico. Hoje tomei um paracetamol.' },
        { id: 'alergias', tema: 'Alergias', item: 'alergias', kw: ['alergi', 'alergic', 'alergia a algum', 'alergia a remedio', 'alergia a medicamento', 'alergia a alguma medicacao', 'alergico a', 'alergica a'], r: 'Não tenho alergia.' },
        { id: 'familia', tema: 'História familiar', kw: ['famili', 'mae ', 'irma ', 'parentes', 'hereditar'], r: 'Minha mãe teve pressão alta na gravidez dela.' },
        { id: 'etilismo', tema: 'Álcool', kw: ['bebida', 'alcool', 'cerveja', 'etilis', 'bebe alcool'], r: 'Parei de beber quando descobri a gravidez.' }
      ],
      exameFisico: [
        { id: 'pa', nome: 'Aferição da PA (repetida, técnica adequada)', item: 'ef_pa', r: 'PA 168x112 mmHg; repetida após 15 minutos, sentada, manguito adequado: 170x110 mmHg.' },
        { id: 'sv', nome: 'Demais sinais vitais', item: 'ef_pa', r: 'FC 92 bpm; FR 18 irpm; SatO₂ 98%; Tax 36,6 °C.' },
        { id: 'geral', nome: 'Ectoscopia / estado geral', r: 'Bom estado geral, ansiosa, corada, hidratada, com edema facial. Lúcida e orientada.' },
        { id: 'reflexos', nome: 'Reflexos patelares', item: 'ef_reflexos', r: 'Vivos e simétricos (3+), sem clônus.' },
        { id: 'edema', nome: 'Pesquisa de edema', r: 'Edema de membros inferiores 3+/4+, também em mãos e face.' },
        { id: 'ap', nome: 'Ausculta pulmonar', item: 'ef_ap', r: 'Murmúrio vesicular presente, sem ruídos adventícios (sem sinais de edema agudo de pulmão).' },
        { id: 'abd', nome: 'Palpação de epigástrio / hipocôndrio direito', r: 'Dor leve à palpação de epigástrio e hipocôndrio direito.' },
        { id: 'au', nome: 'Altura uterina e manobras de Leopold', item: 'ef_obst', r: 'Altura uterina 30 cm. Feto longitudinal, cefálico, dorso à esquerda. Útero com tônus normal, sem contrações.' },
        { id: 'bcf', nome: 'Ausculta dos batimentos cardíacos fetais', item: 'ef_bcf', r: 'BCF 142 bpm, rítmicos.' },
        { id: 'toque', nome: 'Toque vaginal', r: 'Colo posterior, grosso, impérvio. Bolsa íntegra.' },
        { id: 'fo', nome: 'Fundo de olho', r: 'Vasoespasmo arteriolar difuso, sem papiledema ou hemorragias.' }
      ],
      exames: [
        { id: 'prot', nome: 'Relação proteína/creatinina urinária', grupo: 'Laboratório', item: 'lab_pe', r: 'Relação P/C: 0,9 (VR < 0,3).' },
        { id: 'fita', nome: 'Proteinúria em fita', grupo: 'Laboratório', item: 'lab_pe', r: 'Proteína ++/4+.' },
        { id: 'hemo', nome: 'Hemograma com plaquetas', grupo: 'Laboratório', item: 'lab_hellp', r: 'Hb 12,1 g/dL; plaquetas 128.000/mm³; sem esquizócitos.' },
        { id: 'tgo', nome: 'TGO/TGP', grupo: 'Laboratório', item: 'lab_hellp', r: 'TGO 58 U/L; TGP 61 U/L.' },
        { id: 'ldh', nome: 'LDH e bilirrubinas', grupo: 'Laboratório', item: 'lab_hellp', r: 'LDH 480 U/L; bilirrubina total 0,9 mg/dL.' },
        { id: 'cr', nome: 'Creatinina e ácido úrico', grupo: 'Laboratório', item: 'lab_pe', r: 'Creatinina 0,9 mg/dL; ácido úrico 6,8 mg/dL.' },
        { id: 'coag', nome: 'Coagulograma', grupo: 'Laboratório', r: 'TP/INR 1,0; TTPa 31 s; fibrinogênio 380 mg/dL.' },
        { id: 'ctg', nome: 'Cardiotocografia', grupo: 'Vitalidade fetal', item: 'vit_fetal', r: 'Categoria I: FCF basal 140 bpm, variabilidade moderada, acelerações presentes, sem desacelerações.' },
        { id: 'usg', nome: 'USG obstétrica com Doppler', grupo: 'Vitalidade fetal', item: 'vit_fetal', r: 'Feto único, cefálico, peso estimado 1.750 g (p25). ILA 9 cm. Doppler de artéria umbilical normal.' },
        { id: 'tc', nome: 'Tomografia de crânio', grupo: 'Imagem', r: 'Não indicada neste momento (sem déficit focal ou convulsão).' }
      ],
      checklist: {
        anamnese: [
          { id: 'obst', texto: 'Pergunta idade gestacional e paridade', pts: 1 },
          { id: 'prenatal', texto: 'Pergunta sobre o pré-natal e PA prévia', pts: 1 },
          { id: 'cefaleia', texto: 'Caracteriza a cefaleia', pts: 1 },
          { id: 'iminencia', texto: 'Pesquisa sintomas de iminência de eclâmpsia (escotomas, epigastralgia)', pts: 2 },
          { id: 'vitalidade', texto: 'Pergunta sobre movimentação fetal', pts: 1 },
          { id: 'perdas', texto: 'Pergunta perdas vaginais e contrações', pts: 1 },
          { id: 'antecedentes', texto: 'Investiga hipertensão prévia e comorbidades', pts: 1 },
          { id: 'alergias', texto: 'Pergunta sobre alergias', pts: 1 }
        ],
        exame: [
          { id: 'ef_pa', texto: 'Afere/confirma a PA com técnica adequada', pts: 2 },
          { id: 'ef_reflexos', texto: 'Avalia reflexos patelares', pts: 1 },
          { id: 'ef_ap', texto: 'Realiza ausculta pulmonar (edema agudo de pulmão)', pts: 1 },
          { id: 'ef_obst', texto: 'Realiza exame obstétrico (altura uterina, Leopold, dinâmica)', pts: 1 },
          { id: 'ef_bcf', texto: 'Ausculta os batimentos cardíacos fetais', pts: 1 }
        ],
        exames: [
          { id: 'lab_pe', texto: 'Solicita proteinúria e função renal', pts: 1 },
          { id: 'lab_hellp', texto: 'Solicita exames para síndrome HELLP (plaquetas, TGO/TGP, LDH, bilirrubinas)', pts: 2 },
          { id: 'vit_fetal', texto: 'Avalia vitalidade fetal (cardiotocografia e/ou USG com Doppler)', pts: 1 }
        ]
      },
      diagnostico: {
        pts: 2, correta: 0,
        opcoes: [
          'Pré-eclâmpsia com sinais de gravidade (iminência de eclâmpsia)',
          'Hipertensão gestacional sem sinais de gravidade',
          'Eclâmpsia',
          'Síndrome HELLP completa',
          'Enxaqueca com aura na gestação'
        ]
      },
      conduta: [
        { texto: 'Sulfato de magnésio (esquema de Zuspan ou Pritchard) para prevenção de eclâmpsia', correta: true, pts: 2 },
        { texto: 'Anti-hipertensivo de ação rápida (hidralazina EV ou nifedipino VO) — alvo PA 140–150 x 90–100', correta: true, pts: 2 },
        { texto: 'Monitorizar diurese, reflexos patelares e FR (toxicidade do magnésio)', correta: true },
        { texto: 'Corticoide para maturação pulmonar fetal (betametasona), sem atrasar o parto', correta: true },
        { texto: 'Interrupção da gestação após estabilização materna', correta: true, pts: 2 },
        { texto: 'Conduta expectante ambulatorial com retorno em 1 semana', correta: false },
        { texto: 'Enalapril para controle pressórico', correta: false },
        { texto: 'Furosemida para tratar o edema', correta: false }
      ],
      comentarios: [
        'PA ≥ 160x110 mmHg + proteinúria (P/C ≥ 0,3) após 20 semanas + cefaleia, escotomas e epigastralgia = pré-eclâmpsia com sinais de gravidade / iminência de eclâmpsia.',
        'O sulfato de magnésio é a droga de escolha para prevenção e tratamento da eclâmpsia. Toxicidade: abolição do reflexo patelar, FR < 12–16 irpm, diurese < 25–30 mL/h. Antídoto: gluconato de cálcio 10%.',
        'Iminência de eclâmpsia é indicação de interrupção da gestação após estabilização, independentemente da idade gestacional; a via de parto é obstétrica.',
        'IECA/BRA (enalapril, losartana) são contraindicados na gestação. Diuréticos não tratam pré-eclâmpsia.',
        'Rastrear HELLP: hemólise (LDH ≥ 600, esquizócitos, BT ≥ 1,2), elevação de enzimas hepáticas (TGO ≥ 70) e plaquetopenia (< 100.000).'
      ]
    },

    // ------------------------------------------------------------------ 6
    {
      id: 'cetoacidose',
      titulo: 'Vômitos e mal-estar na jovem',
      area: 'Clínica Médica · Endocrinologia',
      nivel: 'Avançado',
      duracao: 10,
      local: 'Pronto-socorro',
      paciente: { nome: 'Carla Mendes', idade: 19, sexo: 'F', avatar: '👩🏻', profissao: 'Sou estudante de enfermagem.' },
      cenario: 'Carla, 19 anos, é trazida pela mãe ao pronto-socorro por vômitos e mal-estar. Triagem: PA 100x60 mmHg, FC 118 bpm, FR 28 irpm, SatO₂ 98%, Tax 36,8 °C.',
      tarefas: [
        'Realize anamnese dirigida.',
        'Realize o exame físico pertinente.',
        'Solicite e interprete os exames complementares.',
        'Defina o diagnóstico e prescreva o tratamento inicial.'
      ],
      abertura: 'Doutor(a)... eu tô muito mal. Não paro de vomitar e minha barriga dói muito.',
      reacaoExplicacao: 'Diabetes? Eu? Mas eu sou nova... Vou ter que tomar insulina para sempre?',
      falas: [
        { id: 'inicio', tema: 'Início', item: 'inicio', kw: KW.inicio, r: 'Os vômitos começaram ontem. Mas faz quase um mês que eu não estou bem.' },
        { id: 'vomitos', tema: 'Vômitos', item: 'tgi', kw: k(KW.nausea, ['quantas vezes']), r: 'Vomitei umas 5 vezes desde ontem. Não para nada no estômago. Não tem sangue.' },
        { id: 'dor', tema: 'Dor abdominal', item: 'tgi', kw: k(KW.local, KW.carater, ['dor', 'doi', 'barriga']), r: 'Dói a barriga toda, tipo uma cólica, desde ontem.' },
        { id: 'poliuria', tema: 'Poliúria', item: 'classicos', kw: ['xixi', 'urina', 'urinando', 'diurese', 'banheiro', 'noite', 'madrugada', 'poliuria'], r: 'Faço xixi toda hora, até de madrugada eu levanto várias vezes.' },
        { id: 'polidipsia', tema: 'Polidipsia', item: 'classicos', kw: ['sede', 'agua', 'polidipsia', 'bebendo muito', 'boca seca'], r: 'Estou com muita sede, bebo uns 4 litros de água por dia e a boca continua seca.' },
        { id: 'peso', tema: 'Perda de peso', item: 'classicos', kw: ['peso', 'emagrec', 'engord', 'kg', 'quilos', 'roupa'], r: 'Perdi uns 6 kg no último mês sem fazer dieta.' },
        { id: 'polifagia', tema: 'Polifagia/apetite', item: 'classicos', kw: ['fome', 'apetite', 'comendo', 'polifagia', 'comer'], r: 'Antes eu estava comendo muito, mesmo assim emagrecendo. Agora não consigo comer nada.' },
        { id: 'dispneia', tema: 'Respiração', kw: KW.dispneia, r: 'Estou respirando rápido, meio cansada.' },
        { id: 'consciencia', tema: 'Nível de consciência', kw: ['sonolen', 'confus', 'desmai', 'tontura', 'tonta', 'fraqueza', 'fraca'], r: 'Estou muito cansada, fraca e com sono.' },
        { id: 'gatilho', tema: 'Fator desencadeante (infecção)', item: 'gatilho', kw: k(KW.febre, ['infecc', 'ardencia', 'arde', 'tosse', 'gripe', 'resfriado', 'garganta', 'ferida', 'machucado', 'corrimento']), r: 'Não tive febre, nem ardência para urinar, nem tosse ou gripe.' },
        { id: 'dm', tema: 'Diagnóstico prévio de diabetes', item: 'dm', kw: ['diabet', 'acucar no sangue', 'glicose', 'glicemia', 'insulina', 'doenca', 'comorbidade', 'problema de saude'], r: 'Não, nunca me falaram que eu tinha diabetes. Também não tenho outra doença.' },
        { id: 'familia', tema: 'História familiar', item: 'familia', kw: ['famili', 'pai ', 'mae ', 'irmao', 'irma ', 'parentes', 'hereditar', 'tio', 'avo'], r: 'Meu tio tem diabetes e usa insulina desde criança.' },
        { id: 'dum', tema: 'DUM / gestação', item: 'dum', kw: ['menstrua', 'dum', 'gravid', 'gestac', 'anticoncep', 'pilula', 'relacao sexual', 'sexualmente', 'atraso'], r: 'Minha menstruação veio há 2 semanas, normal. Uso anticoncepcional.' },
        { id: 'medicacoes', tema: 'Medicações', item: 'medicacoes', kw: ['remedio', 'medicamento', 'medicacao', 'toma algum', 'usa algum', 'tomando algo', 'tomou algo', 'tomou alguma', 'corticoide'], r: 'Só tomo anticoncepcional. Tomei um remédio para enjoo ontem, mas vomitei.' },
        { id: 'drogas', tema: 'Álcool/drogas', kw: ['droga', 'maconha', 'cocaina', 'bebida', 'alcool', 'cerveja', 'etilis', 'bebe '], r: 'Não bebo e não uso drogas.' },
        { id: 'alergias', tema: 'Alergias', item: 'alergias', kw: ['alergi', 'alergic', 'alergia a algum', 'alergia a remedio', 'alergia a medicamento', 'alergia a alguma medicacao', 'alergico a', 'alergica a'], r: 'Não tenho alergia a remédio.' }
      ],
      exameFisico: [
        { id: 'sv', nome: 'Sinais vitais', item: 'ef_sv', r: 'PA 100x60 mmHg; FC 118 bpm; FR 28 irpm; SatO₂ 98%; Tax 36,8 °C.' },
        { id: 'glicemia', nome: 'Glicemia capilar', item: 'glicemia', r: '486 mg/dL.' },
        { id: 'geral', nome: 'Ectoscopia / estado geral', item: 'ef_geral', r: 'Regular estado geral, sonolenta mas orientada (Glasgow 14), desidratada 3+/4+, mucosas secas, hálito cetônico (cheiro de fruta).' },
        { id: 'resp', nome: 'Padrão respiratório e ausculta pulmonar', item: 'ef_resp', r: 'Respiração rápida e profunda (Kussmaul). Murmúrio vesicular presente, sem ruídos adventícios.' },
        { id: 'ac', nome: 'Ausculta cardíaca', r: 'Taquicárdica, ritmo regular, sem sopros.' },
        { id: 'perfusao', nome: 'Perfusão periférica', item: 'ef_geral', r: 'Extremidades frias, enchimento capilar de 3 segundos.' },
        { id: 'abdome', nome: 'Exame do abdome', item: 'ef_abd', r: 'Dor difusa à palpação, sem defesa, sem descompressão dolorosa, ruídos hidroaéreos presentes.' },
        { id: 'neuro', nome: 'Exame neurológico sumário', r: 'Sonolenta, desperta ao chamado, sem déficits focais.' }
      ],
      exames: [
        { id: 'gaso', nome: 'Gasometria (arterial ou venosa)', grupo: 'Laboratório', item: 'gaso', r: 'pH 7,12; pCO₂ 22 mmHg; HCO₃ 8 mEq/L; BE −20; lactato 1,8 mmol/L.' },
        { id: 'eletro', nome: 'Sódio, potássio, cloro, fósforo e magnésio', grupo: 'Laboratório', item: 'eletrolitos', r: 'Na 131 mEq/L; K 5,4 mEq/L; Cl 98 mEq/L; P 3,0 mg/dL; Mg 1,9 mg/dL.' },
        { id: 'cetona', nome: 'Cetonemia (beta-hidroxibutirato)', grupo: 'Laboratório', item: 'cetonas', r: 'Beta-hidroxibutirato 5,8 mmol/L (VR < 0,6).' },
        { id: 'eas', nome: 'Urina tipo I (EAS)', grupo: 'Laboratório', item: 'cetonas', r: 'Glicosúria ++++; cetonúria +++; sem leucocitúria ou nitrito.' },
        { id: 'glicose', nome: 'Glicemia sérica', grupo: 'Laboratório', item: 'glicemia', r: '512 mg/dL.' },
        { id: 'funcao', nome: 'Ureia e creatinina', grupo: 'Laboratório', item: 'eletrolitos', r: 'Ureia 58 mg/dL; creatinina 1,4 mg/dL.' },
        { id: 'hemo', nome: 'Hemograma', grupo: 'Laboratório', r: 'Hb 15,1 g/dL; leucócitos 14.500/mm³ sem desvio; plaquetas 300.000/mm³.' },
        { id: 'bhcg', nome: 'Beta-hCG', grupo: 'Laboratório', item: 'bhcg', r: 'Negativo.' },
        { id: 'amilase', nome: 'Amilase e lipase', grupo: 'Laboratório', r: 'Amilase 110 U/L; lipase 45 U/L.' },
        { id: 'hba1c', nome: 'Hemoglobina glicada', grupo: 'Laboratório', r: 'HbA1c 12,4%.' },
        { id: 'ecg', nome: 'Eletrocardiograma', grupo: 'Outros', item: 'ecg', r: 'Taquicardia sinusal, FC 118 bpm. Sem ondas T apiculadas ou outras alterações.' },
        { id: 'rx', nome: 'Radiografia de tórax', grupo: 'Imagem', r: 'Sem alterações.' }
      ],
      checklist: {
        anamnese: [
          { id: 'inicio', texto: 'Pergunta o tempo de evolução', pts: 1 },
          { id: 'tgi', texto: 'Caracteriza vômitos e dor abdominal', pts: 1 },
          { id: 'classicos', texto: 'Investiga poliúria, polidipsia, polifagia e perda de peso', pts: 2 },
          { id: 'dm', texto: 'Pergunta diagnóstico prévio de diabetes / uso de insulina', pts: 1 },
          { id: 'gatilho', texto: 'Pesquisa fator desencadeante (infecção)', pts: 1 },
          { id: 'familia', texto: 'Pergunta história familiar', pts: 1 },
          { id: 'dum', texto: 'Pergunta DUM / possibilidade de gestação', pts: 1 },
          { id: 'medicacoes', texto: 'Pergunta medicações em uso', pts: 1 },
          { id: 'alergias', texto: 'Pergunta sobre alergias', pts: 1 }
        ],
        exame: [
          { id: 'ef_sv', texto: 'Avalia sinais vitais', pts: 1 },
          { id: 'glicemia', texto: 'Verifica glicemia capilar', pts: 2 },
          { id: 'ef_geral', texto: 'Avalia hidratação, perfusão e nível de consciência', pts: 1 },
          { id: 'ef_resp', texto: 'Avalia padrão respiratório (Kussmaul)', pts: 1 },
          { id: 'ef_abd', texto: 'Examina o abdome', pts: 1 }
        ],
        exames: [
          { id: 'gaso', texto: 'Solicita gasometria', pts: 2 },
          { id: 'eletrolitos', texto: 'Solicita eletrólitos (especialmente potássio) e função renal', pts: 2 },
          { id: 'cetonas', texto: 'Solicita cetonemia ou cetonúria', pts: 1 },
          { id: 'ecg', texto: 'Solicita ECG (repercussão do potássio)', pts: 1 },
          { id: 'bhcg', texto: 'Solicita beta-hCG', pts: 1 }
        ]
      },
      diagnostico: {
        pts: 2, correta: 0,
        opcoes: [
          'Cetoacidose diabética grave como abertura de diabetes tipo 1',
          'Estado hiperglicêmico hiperosmolar',
          'Pancreatite aguda',
          'Gastroenterite aguda com desidratação',
          'Acidose lática'
        ]
      },
      conduta: [
        { texto: 'Hidratação vigorosa com SF 0,9% (15–20 mL/kg na primeira hora)', correta: true, pts: 2 },
        { texto: 'Insulina regular EV em infusão contínua (0,1 U/kg/h) após confirmar K ≥ 3,3', correta: true, pts: 2 },
        { texto: 'Reposição de potássio quando K < 5,2 (manter entre 4 e 5)', correta: true },
        { texto: 'Associar soro glicosado quando a glicemia atingir ~200–250 mg/dL', correta: true },
        { texto: 'Glicemia capilar de hora em hora e eletrólitos/gasometria a cada 2–4 h', correta: true },
        { texto: 'Bicarbonato de sódio de rotina para corrigir a acidose', correta: false },
        { texto: 'Iniciar insulina mesmo se K < 3,3, antes da hidratação', correta: false },
        { texto: 'Insulina NPH subcutânea e alta com retorno ambulatorial', correta: false }
      ],
      comentarios: [
        'Critérios de CAD: glicemia > 250 mg/dL, pH < 7,3 e/ou HCO₃ < 15–18, cetonemia/cetonúria positivas. pH < 7,0–7,1 e HCO₃ < 10 indicam CAD grave.',
        'Ânion gap = Na − (Cl + HCO₃) = 131 − (98 + 8) = 25 (elevado).',
        'Sódio corrigido = 131 + 1,6 × (512 − 100)/100 ≈ 137,6 mEq/L.',
        'O potássio sérico inicial costuma ser normal ou alto, apesar do déficit corporal total. Se K < 3,3: repor potássio ANTES da insulina.',
        'Bicarbonato apenas se pH < 6,9. Resolução: glicemia < 200 e dois entre HCO₃ ≥ 15, pH > 7,3 e ânion gap ≤ 12.',
        'Na transição para insulina SC, sobrepor a insulina basal 1–2 h antes de desligar a bomba.'
      ]
    }
  ];

  if (typeof module !== 'undefined' && module.exports) module.exports = CASOS;
  else root.OSCE_CASOS = CASOS;
})(typeof window !== 'undefined' ? window : this);
