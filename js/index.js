// =========================================================
        // ADMIN / AUTENTICAÇÃO
        // =========================================================

        let usuarioAdmin = null;

        async function verificarAdmin() {

            const {
                data: { session },
                error
            } = await supabaseClient.auth.getSession();

            if (error) {
                console.error('Erro ao verificar sessão:', error);
                return;
            }

            if (session?.user) {
                usuarioAdmin = session.user;
                document.body.classList.add('admin-mode');
            } else {
                usuarioAdmin = null;
                document.body.classList.remove('admin-mode');
            }
        }


        async function loginAdmin(email, senha) {

            const { data, error } =
                await supabaseClient.auth.signInWithPassword({
                    email,
                    password: senha
                });

            if (error) {
                alert('E-mail ou senha inválidos.');
                console.error(error);
                return false;
            }

            usuarioAdmin = data.user;

            document.body.classList.add('admin-mode');

            return true;
        }


        async function logoutAdmin() {

            const { error } =
                await supabaseClient.auth.signOut();

            if (error) {
                console.error(error);
                alert('Não foi possível sair.');
                return;
            }

            usuarioAdmin = null;

            document.body.classList.remove('admin-mode');
        }


        // =========================================================
        // ORDEM DAS LINHAS
        // =========================================================

        const labels = [
            'Linha 1',
            'Linha 2',
            'Linha 3',
            'Linha 4',
            'Linha 5',
            'Linha 6',
            'Linha 7',
            'Linha 8',
            'Linha 9',
            'Linha 10',
            'Linha 14'
        ];


        // =========================================================
        // DADOS VINDOS DO SUPABASE
        // =========================================================

        let atuais = {
            amarela: [],
            vermelha: [],
            nd: []
        };

        let valorBase = [];
        let melhoriaTitulo = [];
        let melhoriaVisivel = [];
        let resumoTitulo = [];
        let resumoValor = [];
        let resumoVisivel = [];
        let painelTitulo = [];
        let informacoesTitulo = [];
        let informacoesAdicionais = [];

        let dadosPainel = [];


        // =========================================================
        // ELEMENTOS DA TELA
        // =========================================================

        const panel =
            document.getElementById('vencimentoPanel');

        const linhaSelecionada =
            document.getElementById('linhaSelecionada');

        let indiceSelecionado = -1;
        let timerAtualizacao;
        let chart;


        // =========================================================
        // CARREGAR DADOS DO SUPABASE
        // =========================================================

        async function carregarDadosSupabase() {

            const { data, error } = await supabaseClient
                .from('painel_notas')
                .select(`
                    id,
                    linha,
                    amarela,
                    vermelha,
                    nd,
                    valor_base,
                    resumo_titulo,
                    resumo_valor
                `);

            if (error) {
                console.error('Erro ao carregar dados do Supabase:', error);
                alert('Não foi possível carregar os dados do painel.');
                return false;
            }

            dadosPainel = labels.map(linha => {
                const registro = data.find(item => item.linha === linha);

                if (!registro) {
                    console.warn(`Nenhum registro encontrado para ${linha}`);
                }

                return registro;
            });

            atuais.amarela = dadosPainel.map(item => item?.amarela ?? 0);
            atuais.vermelha = dadosPainel.map(item => item?.vermelha ?? 0);
            atuais.nd = dadosPainel.map(item => item?.nd ?? 0);

            valorBase = dadosPainel.map(item => item?.valor_base ?? 0);
            resumoTitulo = dadosPainel.map(item => item?.resumo_titulo?.trim() || 'Vencidas');
            resumoValor = dadosPainel.map(item => Number(item?.resumo_valor ?? 0));

            // Configurações opcionais dos cards.
            // Esta consulta é separada de propósito: se houver qualquer
            // problema com esses campos, o gráfico e a tabela continuam.
            melhoriaTitulo = labels.map(() => 'Melhoria desde o início');
            melhoriaVisivel = labels.map(() => true);
            resumoVisivel = labels.map(() => true);
            painelTitulo = labels.map(() => 'Evolução e situação da linha');
            informacoesTitulo = labels.map(() => 'Informações adicionais');

            const { data: configCardsData, error: configCardsError } = await supabaseClient
                .from('painel_notas')
                .select('linha, melhoria_titulo, melhoria_visivel, resumo_visivel, painel_titulo, informacoes_titulo');

            if (configCardsError) {
                console.warn(
                    'Não foi possível carregar as configurações opcionais dos cards. Usando padrões:',
                    configCardsError
                );
            } else {
                labels.forEach((linha, indice) => {
                    const config = configCardsData?.find(item => item.linha === linha);

                    if (!config) return;

                    melhoriaTitulo[indice] =
                        config.melhoria_titulo?.trim() || 'Melhoria desde o início';

                    melhoriaVisivel[indice] =
                        config.melhoria_visivel !== false;

                    resumoVisivel[indice] =
                        config.resumo_visivel !== false;

                    painelTitulo[indice] =
                        config.painel_titulo?.trim() || 'Evolução e situação da linha';

                    informacoesTitulo[indice] =
                        config.informacoes_titulo?.trim() || 'Informações adicionais';
                });
            }

            const { data: infosData, error: infosError } = await supabaseClient
                .from('painel_notas_info')
                .select('id, linha, titulo, quantidade, ordem')
                .order('ordem', { ascending: true })
                .order('id', { ascending: true });

            if (infosError) {
                console.error('Erro ao carregar informações adicionais:', infosError);
                alert('Não foi possível carregar as informações adicionais do painel.');
                return false;
            }

            informacoesAdicionais = infosData ?? [];

            console.log('Dados carregados do Supabase:', dadosPainel);

            return true;
        }


        // =========================================================
        // ATUALIZAR CARDS SUPERIORES E TABELA
        // =========================================================

        function calcularPercentualMelhoria(base, atual) {
            const valorBaseNumero = Number(base || 0);
            const valorAtualNumero = Number(atual || 0);

            if (valorBaseNumero <= 0) {
                return null;
            }

            return ((valorBaseNumero - valorAtualNumero) / valorBaseNumero) * 100;
        }

        function formatarPercentual(valor) {
            if (valor === null || !Number.isFinite(valor)) {
                return '—';
            }

            return `${valor.toFixed(1).replace('.', ',')}%`;
        }

        function aplicarClasseMelhoria(elemento, percentual) {
            if (!elemento) {
                return;
            }

            elemento.classList.remove('negativa', 'neutra');

            if (percentual === null || percentual === 0) {
                elemento.classList.add('neutra');
            } else if (percentual < 0) {
                elemento.classList.add('negativa');
            }
        }

        function atualizarResumoETabela() {

            const totalAmarela = atuais.amarela.reduce(
                (soma, valor) => soma + Number(valor || 0),
                0
            );

            const totalVermelha = atuais.vermelha.reduce(
                (soma, valor) => soma + Number(valor || 0),
                0
            );

            const totalNd = atuais.nd.reduce(
                (soma, valor) => soma + Number(valor || 0),
                0
            );

            const totalGeral =
                totalAmarela +
                totalVermelha +
                totalNd;

            const totalBase = valorBase.reduce(
                (soma, valor) => soma + Number(valor || 0),
                0
            );

            const melhoriaGeral =
                calcularPercentualMelhoria(
                    totalBase,
                    totalGeral
                );

            const elTotalAmarela =
                document.getElementById('totalAmarela');

            const elTotalVermelha =
                document.getElementById('totalVermelha');

            const elTotalNd =
                document.getElementById('totalNd');

            const elTotalGeral =
                document.getElementById('totalGeral');

            const elMelhoriaGeral =
                document.getElementById('melhoriaGeral');

            if (elTotalAmarela) {
                elTotalAmarela.textContent = totalAmarela;
            }

            if (elTotalVermelha) {
                elTotalVermelha.textContent = totalVermelha;
            }

            if (elTotalNd) {
                elTotalNd.textContent = totalNd;
            }

            if (elTotalGeral) {
                elTotalGeral.textContent = totalGeral;
            }

            if (elMelhoriaGeral) {
                elMelhoriaGeral.textContent =
                    formatarPercentual(melhoriaGeral);

                aplicarClasseMelhoria(
                    elMelhoriaGeral,
                    melhoriaGeral
                );
            }

            document
                .querySelectorAll(
                    '#detalhamentoBody td[data-linha][data-field]'
                )
                .forEach(celula => {

                    const linha =
                        celula.dataset.linha;

                    const campo =
                        celula.dataset.field;

                    const registro =
                        dadosPainel.find(
                            item =>
                                item?.linha === linha
                        );

                    if (!registro) {
                        celula.textContent = '0';
                        return;
                    }

                    celula.textContent =
                        registro[campo] ?? 0;
                });
        }


        // =========================================================
        // REALCE DA LINHA NO GRÁFICO
        // =========================================================

        const destaqueLinhaPlugin = {

            id: 'destaqueLinha',

            beforeDatasetsDraw(chart) {

                if (indiceSelecionado < 0) {
                    return;
                }

                const {
                    ctx,
                    chartArea,
                    scales
                } = chart;

                const x = scales.x;

                const centro =
                    x.getPixelForValue(
                        indiceSelecionado
                    );

                let anterior;
                let proximo;


                if (indiceSelecionado > 0) {

                    anterior =
                        x.getPixelForValue(
                            indiceSelecionado - 1
                        );

                } else {

                    anterior =
                        centro -
                        (
                            x.getPixelForValue(1) -
                            centro
                        );
                }


                if (
                    indiceSelecionado <
                    labels.length - 1
                ) {

                    proximo =
                        x.getPixelForValue(
                            indiceSelecionado + 1
                        );

                } else {

                    proximo =
                        centro +
                        (
                            centro -
                            x.getPixelForValue(
                                indiceSelecionado - 1
                            )
                        );
                }


                const largura =
                    Math.min(
                        Math.abs(proximo - centro),
                        Math.abs(centro - anterior)
                    ) * .82;


                ctx.save();

                ctx.fillStyle =
                    'rgba(52, 152, 219, .09)';

                ctx.strokeStyle =
                    'rgba(52, 152, 219, .40)';

                ctx.lineWidth = 1.5;

                ctx.beginPath();

                ctx.roundRect(
                    centro - largura / 2,
                    chartArea.top,
                    largura,
                    chartArea.bottom -
                    chartArea.top,
                    8
                );

                ctx.fill();
                ctx.stroke();

                ctx.restore();
            }
        };



        // =========================================================
        // INFORMAÇÕES ADICIONAIS DAS VENCIDAS
        // =========================================================

        function obterInformacoesDaLinha(linha) {
            return informacoesAdicionais.filter(
                item => item.linha === linha
            );
        }

        function renderizarInformacoesAdicionais(i) {
            const lista = document.getElementById('informacoesAdicionaisLista');
            const secao = document.getElementById('informacoesAdicionaisSection');

            if (!lista || !secao || i < 0) {
                return;
            }

            const linha = labels[i];
            const itens = obterInformacoesDaLinha(linha);
            lista.innerHTML = '';

            const emModoAdmin = document.body.classList.contains('admin-mode');

            if (!itens.length) {
                if (!emModoAdmin) {
                    secao.style.display = 'none';
                    return;
                }

                secao.style.display = 'block';

                const vazio = document.createElement('div');
                vazio.className = 'info-adicional-vazio';
                vazio.textContent = 'Nenhuma informação adicional cadastrada para esta linha.';
                lista.appendChild(vazio);
                return;
            }

            secao.style.display = 'block';

            itens.forEach(item => {
                const card = document.createElement('div');
                card.className = 'info-adicional-item';

                const titulo = document.createElement('div');
                titulo.className = 'info-adicional-item-titulo';
                titulo.textContent = item.titulo;

                const valor = document.createElement('div');
                valor.className = 'info-adicional-item-valor';
                valor.textContent = Number(item.quantidade || 0);

                card.appendChild(titulo);
                card.appendChild(valor);

                if (emModoAdmin) {
                    const acoes = document.createElement('div');
                    acoes.className = 'info-adicional-acoes';

                    const editar = document.createElement('button');
                    editar.type = 'button';
                    editar.className = 'info-mini-btn';
                    editar.title = 'Editar informação';
                    editar.setAttribute('aria-label', 'Editar informação');
                    editar.textContent = '✎';
                    editar.addEventListener('click', () => abrirModalInformacao(item));

                    const excluir = document.createElement('button');
                    excluir.type = 'button';
                    excluir.className = 'info-mini-btn delete';
                    excluir.title = 'Excluir informação';
                    excluir.setAttribute('aria-label', 'Excluir informação');
                    excluir.textContent = '×';
                    excluir.addEventListener('click', () => excluirInformacaoAdicional(item));

                    acoes.appendChild(editar);
                    acoes.appendChild(excluir);
                    card.appendChild(acoes);
                }

                lista.appendChild(card);
            });
        }

        // =========================================================
        // ATUALIZAR PAINEL DE VENCIMENTO
        // =========================================================

        function renderizarCardsOcultos() {
            // A página pública apenas respeita a visibilidade salva.
        }

        function atualizarVencimento(i) {

            if (i === indiceSelecionado) {
                renderizarCardsOcultos(i);
                renderizarInformacoesAdicionais(i);
                return;
            }

            indiceSelecionado = i;

            if (chart) {
                chart.draw();
            }

            panel?.classList.add('atualizando');
            linhaSelecionada?.classList.add('trocando');

            clearTimeout(timerAtualizacao);

            timerAtualizacao = setTimeout(() => {

                const atual =
                    Number(atuais.amarela[i] || 0) +
                    Number(atuais.vermelha[i] || 0) +
                    Number(atuais.nd[i] || 0);

                const base = Number(valorBase[i] || 0);
                const tituloMelhoria = melhoriaTitulo[i] || 'Melhoria desde o início';
                const exibirMelhoria = melhoriaVisivel[i] !== false;
                const tituloPainel = painelTitulo[i] || 'Evolução e situação da linha';
                const tituloInformacoes = informacoesTitulo[i] || 'Informações adicionais';
                const tituloResumo = resumoTitulo[i] || 'Vencidas';
                const valorResumo = Number(resumoValor[i] || 0);
                const exibirResumo = resumoVisivel[i] !== false;
                const melhoria = calcularPercentualMelhoria(base, atual);

                if (linhaSelecionada) {
                    linhaSelecionada.textContent = labels[i];
                }

                const painelTituloLinha = document.getElementById('painelTituloLinha');
                const informacoesTituloLinha = document.getElementById('informacoesTituloLinha');
                const totalAtualLinha = document.getElementById('totalAtualLinha');
                const cardMelhoriaLinha = document.getElementById('cardMelhoriaLinha');
                const melhoriaTituloLinha = document.getElementById('melhoriaTituloLinha');
                const melhoriaLinha = document.getElementById('melhoriaLinha');
                const comparacaoBaseLinha = document.getElementById('comparacaoBaseLinha');
                const cardResumoPrincipal = document.getElementById('cardResumoPrincipal');
                const resumoTituloLinha = document.getElementById('resumoTituloLinha');
                const resumoValorLinha = document.getElementById('resumoValorLinha');

                if (painelTituloLinha) {
                    painelTituloLinha.textContent = tituloPainel;
                }

                if (informacoesTituloLinha) {
                    informacoesTituloLinha.textContent = tituloInformacoes;
                }

                if (totalAtualLinha) {
                    totalAtualLinha.textContent = atual;
                }

                if (cardMelhoriaLinha) {
                    cardMelhoriaLinha.style.display = exibirMelhoria ? 'flex' : 'none';
                }

                if (melhoriaTituloLinha) {
                    melhoriaTituloLinha.textContent = tituloMelhoria;
                }

                if (melhoriaLinha) {
                    melhoriaLinha.textContent = formatarPercentual(melhoria);
                    aplicarClasseMelhoria(melhoriaLinha, melhoria);
                }

                if (comparacaoBaseLinha) {
                    comparacaoBaseLinha.textContent =
                        base > 0
                            ? `Base: ${base} → Atual: ${atual}`
                            : 'Base não definida';
                }

                if (cardResumoPrincipal) {
                    cardResumoPrincipal.style.display = exibirResumo ? 'flex' : 'none';
                }

                if (resumoTituloLinha) {
                    resumoTituloLinha.textContent = tituloResumo;
                }

                if (resumoValorLinha) {
                    resumoValorLinha.textContent = valorResumo;
                }

                renderizarCardsOcultos(i);
                renderizarInformacoesAdicionais(i);

                panel?.classList.add('aberto');
                panel?.classList.remove('atualizando');
                panel?.classList.remove('pulso');

                if (panel) {
                    void panel.offsetWidth;
                }

                panel?.classList.add('pulso');
                linhaSelecionada?.classList.remove('trocando');

            }, 120);
        }


        // =========================================================
        // CRIAR GRÁFICO
        // =========================================================

        function criarGrafico() {

            const canvas =
                document.getElementById(
                    'notasChart'
                );


            if (!canvas) {
                console.error(
                    'Canvas notasChart não encontrado.'
                );

                return;
            }


            chart = new Chart(
                canvas.getContext('2d'),
                {

                    type: 'bar',

                    data: {

                        labels,

                        datasets: [

                            {
                                label: 'Amarela',
                                data:
                                    atuais.amarela,
                                backgroundColor:
                                    '#f1c40f'
                            },

                            {
                                label: 'Vermelha',
                                data:
                                    atuais.vermelha,
                                backgroundColor:
                                    '#e74c3c'
                            },

                            {
                                label: 'ND',
                                data:
                                    atuais.nd,
                                backgroundColor:
                                    '#7f8c8d'
                            }

                        ]
                    },


                    plugins: [
                        destaqueLinhaPlugin
                    ],


                    options: {

                        responsive: true,

                        maintainAspectRatio:
                            false,


                        interaction: {
                            mode: 'index',
                            intersect: false
                        },


                        plugins: {

                            legend: {
                                position: 'top'
                            },

                            tooltip: {

                                callbacks: {

                                    afterBody:
                                        () => []
                                }
                            }
                        },


                        scales: {

                            x: {

                                stacked: true,

                                title: {
                                    display: true,
                                    text: ''
                                }
                            },


                            y: {

                                stacked: true,

                                beginAtZero: true,

                                title: {
                                    display: true,
                                    text:
                                        'Quantidade de notas'
                                },

                                ticks: {
                                    stepSize: 10
                                }
                            }
                        },


                        onHover:
                            function (
                                event,
                                elements
                            ) {

                                if (
                                    !elements.length
                                ) {
                                    return;
                                }


                                atualizarVencimento(
                                    elements[0]
                                        .index
                                );
                            }
                    }
                }
            );
        }


        // =========================================================
        // ATUALIZAR GRÁFICO SEM RECRIAR
        // =========================================================

        function atualizarGrafico() {

            if (!chart) {
                return;
            }


            chart.data.datasets[0].data =
                atuais.amarela;

            chart.data.datasets[1].data =
                atuais.vermelha;

            chart.data.datasets[2].data =
                atuais.nd;


            chart.update();
        }


        // =========================================================
        // RECARREGAR TUDO DO SUPABASE
        // =========================================================

        async function recarregarPainel() {

            const carregou =
                await carregarDadosSupabase();


            if (!carregou) {
                return;
            }


            atualizarResumoETabela();

            atualizarGrafico();


            // Se uma linha já estava selecionada,
            // força a atualização do painel dela.

            if (indiceSelecionado >= 0) {

                const indiceAnterior =
                    indiceSelecionado;

                indiceSelecionado = -1;

                atualizarVencimento(
                    indiceAnterior
                );
            }
        }


        // =========================================================
        // INICIAR APLICAÇÃO
        // =========================================================

        async function iniciarAplicacao() {

            const carregou =
                await carregarDadosSupabase();


            if (!carregou) {
                return;
            }


            atualizarResumoETabela();

            criarGrafico();
        }


        iniciarAplicacao();
