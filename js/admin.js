// =========================================================
        // ADMIN / AUTENTICAÇÃO
        // =========================================================

        // Este arquivo é a página administrativa.
        const PAGINA_ADMIN = true;

        let usuarioAdmin = null;

        // Captura o tipo do link antes que o Supabase limpe a URL.
        const authHashInicial = new URLSearchParams(window.location.hash.substring(1));
        const authQueryInicial = new URLSearchParams(window.location.search);
        const tipoAuthInicial = authHashInicial.get('type') || authQueryInicial.get('type');

        const abriuPorLinkDeAuth =
            tipoAuthInicial === 'invite'
            || tipoAuthInicial === 'recovery'
            || authHashInicial.has('access_token')
            || authQueryInicial.has('code');

        if (abriuPorLinkDeAuth) {
            sessionStorage.setItem('admin_precisa_definir_senha', '1');
        }

        function precisaDefinirSenha() {
            return sessionStorage.getItem('admin_precisa_definir_senha') === '1';
        }

        function mostrarTelaLogin() {
            document.getElementById('criarSenhaAdmin')?.classList.add('oculto');
            document.getElementById('loginAdmin')?.classList.remove('oculto');
            document.body.classList.remove('admin-mode');
        }

        function mostrarTelaCriarSenha() {
            document.getElementById('loginAdmin')?.classList.add('oculto');
            document.getElementById('criarSenhaAdmin')?.classList.remove('oculto');
            document.body.classList.remove('admin-mode');
        }

        function atualizarUsuarioCabecalho() {
            const elemento = document.getElementById('adminUserName');
            if (!elemento) return;
            if (!usuarioAdmin) {
                elemento.textContent = 'Administrador';
                return;
            }

            const metadata = usuarioAdmin.user_metadata || {};
            const nome = metadata.nome || metadata.full_name || metadata.name || usuarioAdmin.email || 'Administrador';
            elemento.textContent = nome;
        }

        function liberarAdmin() {
            document.getElementById('loginAdmin')?.classList.add('oculto');
            document.getElementById('criarSenhaAdmin')?.classList.add('oculto');
            document.body.classList.add('admin-mode');
            atualizarUsuarioCabecalho();
        }

        async function verificarAdmin() {
            const { data: { session }, error } = await supabaseClient.auth.getSession();
            if (error) {
                console.error('Erro ao verificar sessão:', error);
                usuarioAdmin = null;
                return false;
            }
            usuarioAdmin = session?.user || null;
            return Boolean(usuarioAdmin);
        }

        async function iniciarAdmin() {
            const autenticado = await verificarAdmin();

            // Convite ou recuperação: exige definir senha antes de liberar o painel.
            if (autenticado && precisaDefinirSenha()) {
                mostrarTelaCriarSenha();
                return;
            }

            if (autenticado) {
                liberarAdmin();
                return;
            }

            mostrarTelaLogin();
        }

        async function loginAdmin(email, senha) {
            const { data, error } = await supabaseClient.auth.signInWithPassword({
                email,
                password: senha
            });

            if (error) {
                console.error('Erro no login:', error);
                alert('E-mail ou senha incorretos.');
                return false;
            }

            usuarioAdmin = data.user;
            liberarAdmin();
            return true;
        }

        async function logoutAdmin() {
            const { error } = await supabaseClient.auth.signOut();
            if (error) {
                console.error('Erro ao sair:', error);
                alert('Não foi possível sair.');
                return;
            }

            usuarioAdmin = null;
            sessionStorage.removeItem('admin_precisa_definir_senha');
            mostrarTelaLogin();
            document.getElementById('adminSenha')?.focus();
        }

        function configurarLoginAdmin() {
            const btnLogin = document.getElementById('btnLoginAdmin');

            btnLogin?.addEventListener('click', async () => {
                const email = document.getElementById('adminEmail')?.value.trim();
                const senha = document.getElementById('adminSenha')?.value;

                if (!email || !senha) {
                    alert('Preencha o e-mail e a senha.');
                    return;
                }

                await loginAdmin(email, senha);
            });

            document.getElementById('adminSenha')?.addEventListener('keydown', event => {
                if (event.key === 'Enter') btnLogin?.click();
            });

            document.getElementById('btnLogoutAdmin')?.addEventListener('click', logoutAdmin);
        }

        function configurarRecuperacaoSenha() {
            document.getElementById('btnDefinirSenhaAdmin')?.addEventListener('click', async () => {
                const email = document.getElementById('adminEmail')?.value.trim();

                if (!email) {
                    alert('Informe seu e-mail primeiro.');
                    document.getElementById('adminEmail')?.focus();
                    return;
                }

                const redirectTo = window.location.origin + window.location.pathname;
                const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo });

                if (error) {
                    console.error('Erro ao enviar link de senha:', error);
                    alert('Não foi possível enviar o link. Verifique o e-mail e tente novamente.');
                    return;
                }

                alert('Enviamos um link para o seu e-mail. Abra-o para definir sua senha.');
            });
        }

        function configurarCriacaoSenha() {
            const botao = document.getElementById('btnCriarSenhaAdmin');

            botao?.addEventListener('click', async () => {
                const nome = document.getElementById('nomeAdmin')?.value.trim();
                const novaSenha = document.getElementById('novaSenhaAdmin')?.value;
                const confirmar = document.getElementById('confirmarSenhaAdmin')?.value;

                if (!nome) {
                    alert('Digite seu nome.');
                    return;
                }
                if (!novaSenha) {
                    alert('Digite uma senha.');
                    return;
                }
                if (novaSenha.length < 8) {
                    alert('A senha deve ter pelo menos 8 caracteres.');
                    return;
                }
                if (novaSenha !== confirmar) {
                    alert('As senhas não são iguais.');
                    return;
                }

                const { data, error } = await supabaseClient.auth.updateUser({
                    password: novaSenha,
                    data: { nome }
                });

                if (error) {
                    console.error('Erro ao definir senha:', error);
                    alert('Não foi possível definir a senha.');
                    return;
                }

                // Encerra a sessão temporária criada pelo convite/recuperação.
                // Assim o usuário precisa entrar normalmente com e-mail + senha.
                const { error: erroLogout } = await supabaseClient.auth.signOut();
                if (erroLogout) {
                    console.error('Senha criada, mas houve erro ao encerrar a sessão temporária:', erroLogout);
                }

                usuarioAdmin = null;
                sessionStorage.removeItem('admin_precisa_definir_senha');
                history.replaceState({}, document.title, window.location.pathname);

                document.getElementById('novaSenhaAdmin').value = '';
                document.getElementById('confirmarSenhaAdmin').value = '';

                const emailLogin = document.getElementById('adminEmail');
                if (emailLogin && data.user?.email) emailLogin.value = data.user.email;

                mostrarTelaLogin();
                alert('Senha cadastrada com sucesso. Agora entre com seu e-mail e a nova senha.');
            });
        }

        supabaseClient.auth.onAuthStateChange((event, session) => {
            usuarioAdmin = session?.user || null;

            if (event === 'SIGNED_OUT') {
                mostrarTelaLogin();
                return;
            }

            if (usuarioAdmin && !precisaDefinirSenha()) {
                atualizarUsuarioCabecalho();
            }
        });


        // =========================================================
        // LINHAS
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
        // DADOS DO SUPABASE
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
        // ELEMENTOS
        // =========================================================

        const panel =
            document.getElementById(
                'vencimentoPanel'
            );


        const linhaSelecionada =
            document.getElementById(
                'linhaSelecionada'
            );


        let indiceSelecionado = -1;

        let timerAtualizacao;

        let chart;


        // =========================================================
        // CARREGAR DADOS
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
        // ATUALIZA CARDS E TABELA
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
        // PLUGIN DE DESTAQUE DA LINHA
        // =========================================================

        const destaqueLinhaPlugin = {

            id:
                'destaqueLinha',


            beforeDatasetsDraw(chart) {

                if (
                    indiceSelecionado < 0
                ) {

                    return;
                }


                const {
                    ctx,
                    chartArea,
                    scales
                } = chart;


                const x =
                    scales.x;


                const centro =
                    x.getPixelForValue(
                        indiceSelecionado
                    );


                let anterior;

                let proximo;


                if (
                    indiceSelecionado > 0
                ) {

                    anterior =
                        x.getPixelForValue(
                            indiceSelecionado - 1
                        );

                } else {

                    anterior =
                        centro
                        -
                        (
                            x.getPixelForValue(1)
                            -
                            centro
                        );
                }


                if (
                    indiceSelecionado
                    <
                    labels.length - 1
                ) {

                    proximo =
                        x.getPixelForValue(
                            indiceSelecionado + 1
                        );

                } else {

                    proximo =
                        centro
                        +
                        (
                            centro
                            -
                            x.getPixelForValue(
                                indiceSelecionado - 1
                            )
                        );
                }


                const largura =
                    Math.min(
                        Math.abs(
                            proximo
                            -
                            centro
                        ),
                        Math.abs(
                            centro
                            -
                            anterior
                        )
                    )
                    *
                    .82;


                ctx.save();


                ctx.fillStyle =
                    'rgba(52, 152, 219, .09)';


                ctx.strokeStyle =
                    'rgba(52, 152, 219, .40)';


                ctx.lineWidth =
                    1.5;


                ctx.beginPath();


                ctx.roundRect(
                    centro - largura / 2,
                    chartArea.top,
                    largura,
                    chartArea.bottom
                    -
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


            chart =
                new Chart(
                    canvas.getContext('2d'),
                    {

                        type:
                            'bar',


                        data: {

                            labels:


                                labels,


                            datasets: [

                                {
                                    label:
                                        'Amarela',

                                    data:
                                        atuais.amarela,

                                    backgroundColor:
                                        '#f1c40f'
                                },

                                {
                                    label:
                                        'Vermelha',

                                    data:
                                        atuais.vermelha,

                                    backgroundColor:
                                        '#e74c3c'
                                },

                                {
                                    label:
                                        'ND',

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

                            responsive:
                                true,


                            maintainAspectRatio:
                                false,


                            interaction: {

                                mode:
                                    'index',

                                intersect:
                                    false

                            },


                            plugins: {

                                legend: {

                                    position:
                                        'top'

                                }

                            },


                            scales: {

                                x: {

                                    stacked:
                                        true

                                },


                                y: {

                                    stacked:
                                        true,


                                    beginAtZero:
                                        true,


                                    title: {

                                        display:
                                            true,


                                        text:
                                            'Quantidade de notas'

                                    },


                                    ticks: {

                                        stepSize:
                                            10

                                    }

                                }

                            },


                            onHover(
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
        // ATUALIZA GRÁFICO
        // =========================================================

        function atualizarGrafico() {

            if (!chart) {

                return;
            }


            chart
                .data
                .datasets[0]
                .data =
                atuais.amarela;


            chart
                .data
                .datasets[1]
                .data =
                atuais.vermelha;


            chart
                .data
                .datasets[2]
                .data =
                atuais.nd;


            chart.update();
        }


        // =========================================================
        // UPDATE SUPABASE
        // =========================================================

        async function atualizarCampoSupabase(
            linha,
            campo,
            valor
        ) {

            if (!usuarioAdmin) {

                alert(
                    'Você precisa estar autenticado.'
                );


                return false;
            }


            const {
                error
            } =
                await supabaseClient
                    .from(
                        'painel_notas'
                    )
                    .update({

                        [campo]:
                            valor

                    })
                    .eq(
                        'linha',
                        linha
                    );


            if (error) {

                console.error(
                    'Erro ao atualizar:',
                    error
                );


                alert(
                    'Não foi possível salvar a alteração.'
                );


                return false;
            }


            await recarregarPainel();


            return true;
        }


        // =========================================================
        // PREPARAR VALORES
        // =========================================================

        function prepararValor(
            campo,
            valorDigitado
        ) {

            const camposNumericos = [
                'amarela',
                'vermelha',
                'nd',
                'valor_base'
            ];


            const camposTexto = [];


            // =====================================================
            // NÚMEROS
            // =====================================================

            if (
                camposNumericos.includes(
                    campo
                )
            ) {

                const numero =
                    Number(
                        valorDigitado
                    );


                if (
                    !Number.isInteger(
                        numero
                    )
                    ||
                    numero < 0
                ) {

                    return {

                        valido:
                            false

                    };
                }


                return {

                    valido:
                        true,

                    valor:
                        numero

                };
            }


            // =====================================================
            // TEXTO
            // =====================================================

            if (
                camposTexto.includes(
                    campo
                )
            ) {

                const texto =
                    valorDigitado.trim();


                return {

                    valido:
                        true,

                    valor:
                        texto === ''
                            ? null
                            : texto

                };
            }


            return {

                valido:
                    false

            };
        }


        // =========================================================
        // EDIÇÃO DOS CARDS
        // =========================================================

        function configurarEdicaoCards() {

            document
                .querySelectorAll(
                    '.edit-btn[data-field]'
                )
                .forEach(
                    botao => {

                        botao
                            .addEventListener(
                                'click',
                                async event => {

                                    event.stopPropagation();


                                    if (
                                        !usuarioAdmin
                                    ) {

                                        alert(
                                            'Faça login como administrador.'
                                        );

                                        return;
                                    }


                                    if (
                                        indiceSelecionado < 0
                                    ) {

                                        alert(
                                            'Selecione uma linha no gráfico primeiro.'
                                        );

                                        return;
                                    }


                                    const campo =
                                        botao.dataset.field;


                                    const label =
                                        botao.dataset.label
                                        ||
                                        campo;


                                    const linha =
                                        labels[
                                        indiceSelecionado
                                        ];


                                    const registro =
                                        dadosPainel[
                                        indiceSelecionado
                                        ];


                                    if (!registro) {

                                        return;
                                    }


                                    const valorAtual =
                                        registro[
                                        campo
                                        ];


                                    const novoValor =
                                        prompt(
                                            `${label} - ${linha}`,
                                            valorAtual
                                            ??
                                            ''
                                        );


                                    if (
                                        novoValor
                                        ===
                                        null
                                    ) {

                                        return;
                                    }


                                    const resultado =
                                        prepararValor(
                                            campo,
                                            novoValor
                                        );


                                    if (
                                        !resultado.valido
                                    ) {

                                        alert(
                                            'Digite um valor válido.'
                                        );


                                        return;
                                    }

                                    await atualizarCampoSupabase(
                                        linha,
                                        campo,
                                        resultado.valor
                                    );
                                }
                            );
                    }
                );
        }


        // =========================================================
        // EDIÇÃO DA TABELA
        // =========================================================

        function configurarEdicaoTabela() {

            document
                .querySelectorAll(
                    '#detalhamentoBody td[data-linha][data-field]'
                )
                .forEach(
                    celula => {

                        celula
                            .addEventListener(
                                'click',
                                async () => {

                                    if (
                                        !usuarioAdmin
                                    ) {

                                        return;
                                    }


                                    const linha =
                                        celula.dataset.linha;


                                    const campo =
                                        celula.dataset.field;


                                    const registro =
                                        dadosPainel.find(
                                            item =>
                                                item?.linha
                                                ===
                                                linha
                                        );


                                    if (!registro) {

                                        return;
                                    }


                                    const valorAtual =
                                        registro[campo]
                                        ??
                                        0;


                                    const novoValor =
                                        prompt(
                                            `${campo} - ${linha}`,
                                            valorAtual
                                        );


                                    if (
                                        novoValor
                                        ===
                                        null
                                    ) {

                                        return;
                                    }


                                    const resultado =
                                        prepararValor(
                                            campo,
                                            novoValor
                                        );


                                    if (
                                        !resultado.valido
                                    ) {

                                        alert(
                                            'Digite um número inteiro válido.'
                                        );


                                        return;
                                    }


                                    await atualizarCampoSupabase(
                                        linha,
                                        campo,
                                        resultado.valor
                                    );
                                }
                            );
                    }
                );
        }






        // =========================================================
        // TÍTULOS EDITÁVEIS DO PAINEL
        // =========================================================

        async function editarTituloDoPainel(campo, valorAtual, tituloPrompt) {
            if (!usuarioAdmin) {
                alert('Faça login como administrador.');
                return;
            }

            if (indiceSelecionado < 0) {
                alert('Selecione uma linha no gráfico primeiro.');
                return;
            }

            const novoValor = prompt(tituloPrompt, valorAtual || '');

            if (novoValor === null) {
                return;
            }

            const titulo = novoValor.trim();

            if (!titulo) {
                alert('O título não pode ficar vazio.');
                return;
            }

            const { error } = await supabaseClient
                .from('painel_notas')
                .update({ [campo]: titulo })
                .eq('linha', labels[indiceSelecionado]);

            if (error) {
                console.error('Erro ao salvar título:', error);
                alert('Não foi possível salvar o título.');
                return;
            }

            await recarregarPainel();
        }

        function configurarTitulosEditaveis() {
            document.getElementById('editarPainelTitulo')
                ?.addEventListener('click', event => {
                    event.stopPropagation();

                    editarTituloDoPainel(
                        'painel_titulo',
                        painelTitulo[indiceSelecionado] || 'Evolução e situação da linha',
                        'Título do painel:'
                    );
                });

            document.getElementById('editarInformacoesTitulo')
                ?.addEventListener('click', event => {
                    event.stopPropagation();

                    editarTituloDoPainel(
                        'informacoes_titulo',
                        informacoesTitulo[indiceSelecionado] || 'Informações adicionais',
                        'Título da seção de informações:'
                    );
                });
        }

        // =========================================================
        // CARDS DINÂMICOS: MELHORIA / INDICADOR PRINCIPAL
        // =========================================================

        function abrirModalMelhoria() {
            if (!usuarioAdmin) {
                alert('Faça login como administrador.');
                return;
            }

            if (indiceSelecionado < 0) {
                alert('Selecione uma linha no gráfico primeiro.');
                return;
            }

            const tituloInput = document.getElementById('melhoriaTituloInput');
            const baseInput = document.getElementById('melhoriaBaseInput');
            const modal = document.getElementById('melhoriaModal');

            if (tituloInput) {
                tituloInput.value =
                    melhoriaTitulo[indiceSelecionado] || 'Melhoria desde o início';
            }

            if (baseInput) {
                baseInput.value = Number(valorBase[indiceSelecionado] || 0);
            }

            modal?.classList.remove('oculto');
            modal?.setAttribute('aria-hidden', 'false');
            setTimeout(() => tituloInput?.focus(), 0);
        }

        function fecharModalMelhoria() {
            const modal = document.getElementById('melhoriaModal');
            modal?.classList.add('oculto');
            modal?.setAttribute('aria-hidden', 'true');
        }

        async function salvarMelhoria() {
            if (!usuarioAdmin || indiceSelecionado < 0) {
                return;
            }

            const titulo =
                document.getElementById('melhoriaTituloInput')?.value.trim();

            const baseDigitada =
                document.getElementById('melhoriaBaseInput')?.value;

            const base = Number(baseDigitada);

            if (!titulo) {
                alert('Digite um título para o card.');
                return;
            }

            if (!Number.isInteger(base) || base < 0) {
                alert('Digite um valor base inteiro maior ou igual a zero.');
                return;
            }

            const { error } = await supabaseClient
                .from('painel_notas')
                .update({
                    melhoria_titulo: titulo,
                    valor_base: base,
                    melhoria_visivel: true
                })
                .eq('linha', labels[indiceSelecionado]);

            if (error) {
                console.error('Erro ao salvar o card de melhoria:', error);
                alert('Não foi possível salvar o card de melhoria.');
                return;
            }

            fecharModalMelhoria();
            await recarregarPainel();
        }

        async function alterarVisibilidadeCard(campo, visivel) {
            if (!usuarioAdmin || indiceSelecionado < 0) {
                return;
            }

            const { error } = await supabaseClient
                .from('painel_notas')
                .update({ [campo]: visivel })
                .eq('linha', labels[indiceSelecionado]);

            if (error) {
                console.error('Erro ao alterar a visibilidade do card:', error);
                alert('Não foi possível alterar a visibilidade do card.');
                return;
            }

            await recarregarPainel();
        }

        async function removerMelhoria() {
            const confirmou = confirm(
                'Remover este card desta linha? Você poderá restaurá-lo depois.'
            );

            if (!confirmou) return;

            await alterarVisibilidadeCard('melhoria_visivel', false);
        }

        async function removerResumoPrincipal() {
            const confirmou = confirm(
                'Remover este card desta linha? Você poderá restaurá-lo depois.'
            );

            if (!confirmou) return;

            await alterarVisibilidadeCard('resumo_visivel', false);
        }

        function renderizarCardsOcultos(i) {
            const area = document.getElementById('cardsOcultosArea');

            if (!area || i < 0) {
                return;
            }

            area.innerHTML = '';

            if (melhoriaVisivel[i] === false) {
                const botao = document.createElement('button');
                botao.type = 'button';
                botao.className = 'restaurar-card-btn';
                botao.textContent = '+ Restaurar card de melhoria';

                botao.addEventListener('click', () => {
                    alterarVisibilidadeCard('melhoria_visivel', true);
                });

                area.appendChild(botao);
            }

            if (resumoVisivel[i] === false) {
                const botao = document.createElement('button');
                botao.type = 'button';
                botao.className = 'restaurar-card-btn';
                botao.textContent = '+ Restaurar indicador';

                botao.addEventListener('click', () => {
                    alterarVisibilidadeCard('resumo_visivel', true);
                });

                area.appendChild(botao);
            }

            area.style.display =
                area.children.length > 0
                    ? 'flex'
                    : 'none';
        }

        function configurarCardsDinamicos() {
            document.getElementById('editarMelhoria')
                ?.addEventListener('click', event => {
                    event.stopPropagation();
                    abrirModalMelhoria();
                });

            document.getElementById('removerMelhoria')
                ?.addEventListener('click', event => {
                    event.stopPropagation();
                    removerMelhoria();
                });

            document.getElementById('removerResumoPrincipal')
                ?.addEventListener('click', event => {
                    event.stopPropagation();
                    removerResumoPrincipal();
                });

            document.getElementById('btnCancelarMelhoria')
                ?.addEventListener('click', fecharModalMelhoria);

            document.getElementById('btnSalvarMelhoria')
                ?.addEventListener('click', salvarMelhoria);

            document.getElementById('melhoriaModal')
                ?.addEventListener('click', event => {
                    if (event.target?.id === 'melhoriaModal') {
                        fecharModalMelhoria();
                    }
                });

            document.getElementById('melhoriaBaseInput')
                ?.addEventListener('keydown', event => {
                    if (event.key === 'Enter') {
                        salvarMelhoria();
                    }
                });
        }

        // =========================================================
        // INDICADOR PRINCIPAL DINÂMICO
        // =========================================================

        function abrirModalResumoPrincipal() {
            if (!usuarioAdmin) {
                alert('Faça login como administrador.');
                return;
            }

            if (indiceSelecionado < 0) {
                alert('Selecione uma linha no gráfico primeiro.');
                return;
            }

            const tituloInput = document.getElementById('resumoTituloInput');
            const valorInput = document.getElementById('resumoValorInput');
            const modal = document.getElementById('resumoPrincipalModal');

            if (tituloInput) {
                tituloInput.value = resumoTitulo[indiceSelecionado] || 'Vencidas';
            }

            if (valorInput) {
                valorInput.value = Number(resumoValor[indiceSelecionado] || 0);
            }

            modal?.classList.remove('oculto');
            modal?.setAttribute('aria-hidden', 'false');

            setTimeout(() => tituloInput?.focus(), 0);
        }

        function fecharModalResumoPrincipal() {
            const modal = document.getElementById('resumoPrincipalModal');
            modal?.classList.add('oculto');
            modal?.setAttribute('aria-hidden', 'true');
        }

        async function salvarResumoPrincipal() {
            if (!usuarioAdmin || indiceSelecionado < 0) {
                return;
            }

            const titulo = document.getElementById('resumoTituloInput')?.value.trim();
            const valorDigitado = document.getElementById('resumoValorInput')?.value;
            const valor = Number(valorDigitado);

            if (!titulo) {
                alert('Digite um título para o indicador.');
                return;
            }

            if (!Number.isInteger(valor) || valor < 0) {
                alert('Digite um valor inteiro maior ou igual a zero.');
                return;
            }

            const linha = labels[indiceSelecionado];

            const { error } = await supabaseClient
                .from('painel_notas')
                .update({
                    resumo_titulo: titulo,
                    resumo_valor: valor,
                    resumo_visivel: true
                })
                .eq('linha', linha);

            if (error) {
                console.error('Erro ao salvar indicador principal:', error);
                alert('Não foi possível salvar o indicador.');
                return;
            }

            fecharModalResumoPrincipal();
            await recarregarPainel();
        }

        function configurarResumoPrincipal() {
            document.getElementById('editarResumoPrincipal')
                ?.addEventListener('click', event => {
                    event.stopPropagation();
                    abrirModalResumoPrincipal();
                });

            document.getElementById('btnCancelarResumoPrincipal')
                ?.addEventListener('click', fecharModalResumoPrincipal);

            document.getElementById('btnSalvarResumoPrincipal')
                ?.addEventListener('click', salvarResumoPrincipal);

            document.getElementById('resumoPrincipalModal')
                ?.addEventListener('click', event => {
                    if (event.target?.id === 'resumoPrincipalModal') {
                        fecharModalResumoPrincipal();
                    }
                });

            document.getElementById('resumoValorInput')
                ?.addEventListener('keydown', event => {
                    if (event.key === 'Enter') {
                        salvarResumoPrincipal();
                    }
                });
        }

        // =========================================================
        // CRUD DAS INFORMAÇÕES ADICIONAIS
        // =========================================================

        let informacaoEmEdicao = null;

        function abrirModalInformacao(item = null) {
            if (!usuarioAdmin) {
                alert('Faça login como administrador.');
                return;
            }

            if (indiceSelecionado < 0) {
                alert('Selecione uma linha no gráfico primeiro.');
                return;
            }

            informacaoEmEdicao = item;

            const modal = document.getElementById('infoModal');
            const tituloModal = document.getElementById('infoModalTitulo');
            const tituloInput = document.getElementById('infoTituloInput');
            const quantidadeInput = document.getElementById('infoQuantidadeInput');

            if (tituloModal) {
                tituloModal.textContent = item ? 'Editar informação' : 'Adicionar informação';
            }

            if (tituloInput) {
                tituloInput.value = item?.titulo ?? '';
            }

            if (quantidadeInput) {
                quantidadeInput.value = item?.quantidade ?? 0;
            }

            modal?.classList.remove('oculto');
            modal?.setAttribute('aria-hidden', 'false');
            setTimeout(() => tituloInput?.focus(), 0);
        }

        function fecharModalInformacao() {
            informacaoEmEdicao = null;
            const modal = document.getElementById('infoModal');
            modal?.classList.add('oculto');
            modal?.setAttribute('aria-hidden', 'true');
        }

        async function salvarInformacaoAdicional() {
            if (!usuarioAdmin || indiceSelecionado < 0) return;

            const titulo = document.getElementById('infoTituloInput')?.value.trim();
            const quantidadeDigitada = document.getElementById('infoQuantidadeInput')?.value;
            const quantidade = Number(quantidadeDigitada);

            if (!titulo) {
                alert('Digite um título para a informação.');
                return;
            }

            if (!Number.isInteger(quantidade) || quantidade < 0) {
                alert('Digite uma quantidade inteira válida.');
                return;
            }

            const linha = labels[indiceSelecionado];

            if (informacaoEmEdicao) {
                const { error } = await supabaseClient
                    .from('painel_notas_info')
                    .update({ titulo, quantidade })
                    .eq('id', informacaoEmEdicao.id);

                if (error) {
                    console.error('Erro ao editar informação:', error);
                    alert('Não foi possível editar a informação.');
                    return;
                }
            } else {
                const itensLinha = obterInformacoesDaLinha(linha);
                const maiorOrdem = itensLinha.reduce(
                    (maior, item) => Math.max(maior, Number(item.ordem || 0)),
                    0
                );

                const { error } = await supabaseClient
                    .from('painel_notas_info')
                    .insert({
                        linha,
                        titulo,
                        quantidade,
                        ordem: maiorOrdem + 1
                    });

                if (error) {
                    console.error('Erro ao adicionar informação:', error);
                    alert('Não foi possível adicionar a informação.');
                    return;
                }
            }

            fecharModalInformacao();
            await recarregarPainel();
        }

        async function excluirInformacaoAdicional(item) {
            if (!usuarioAdmin || !item) return;

            const confirmou = confirm(`Excluir “${item.titulo}”?`);
            if (!confirmou) return;

            const { error } = await supabaseClient
                .from('painel_notas_info')
                .delete()
                .eq('id', item.id);

            if (error) {
                console.error('Erro ao excluir informação:', error);
                alert('Não foi possível excluir a informação.');
                return;
            }

            await recarregarPainel();
        }

        function configurarInformacoesAdicionais() {
            document.getElementById('btnAdicionarInformacao')
                ?.addEventListener('click', () => abrirModalInformacao());

            document.getElementById('btnCancelarInformacao')
                ?.addEventListener('click', fecharModalInformacao);

            document.getElementById('btnSalvarInformacao')
                ?.addEventListener('click', salvarInformacaoAdicional);

            document.getElementById('infoModal')
                ?.addEventListener('click', event => {
                    if (event.target?.id === 'infoModal') {
                        fecharModalInformacao();
                    }
                });

            document.getElementById('infoQuantidadeInput')
                ?.addEventListener('keydown', event => {
                    if (event.key === 'Enter') {
                        salvarInformacaoAdicional();
                    }
                });
        }

        // =========================================================
        // RECARREGAR TUDO
        // =========================================================

        async function recarregarPainel() {

            const carregou =
                await carregarDadosSupabase();


            if (!carregou) {

                return;
            }


            atualizarResumoETabela();


            atualizarGrafico();


            // =====================================================
            // ATUALIZA A LINHA QUE ESTAVA SELECIONADA
            // =====================================================

            if (
                indiceSelecionado >= 0
            ) {

                const indiceAnterior =
                    indiceSelecionado;


                indiceSelecionado =
                    -1;


                atualizarVencimento(
                    indiceAnterior
                );
            }
        }


        // =========================================================
        // MOSTRAR / OCULTAR SENHAS
        // =========================================================

        function configurarVisualizacaoSenha() {

            document
                .querySelectorAll('.password-toggle[data-target]')
                .forEach(botao => {

                    botao.addEventListener('click', () => {

                        const input = document.getElementById(
                            botao.dataset.target
                        );

                        if (!input) {
                            return;
                        }

                        const mostrando =
                            input.type === 'text';

                        input.type = mostrando
                            ? 'password'
                            : 'text';

                        botao.setAttribute(
                            'aria-label',
                            mostrando
                                ? 'Mostrar senha'
                                : 'Ocultar senha'
                        );

                        botao.title = mostrando
                            ? 'Mostrar senha'
                            : 'Ocultar senha';

                        botao.innerHTML = mostrando
                            ? `
                                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                    <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                                    <circle cx="12" cy="12" r="2.7" stroke="currentColor" stroke-width="1.8"/>
                                </svg>
                              `
                            : `
                                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                    <path d="M3 3l18 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                                    <path d="M10.6 6.2A9.7 9.7 0 0 1 12 6c6 0 9.5 6 9.5 6a14.9 14.9 0 0 1-3 3.7M6.2 6.2C3.8 8 2.5 12 2.5 12s3.5 6 9.5 6a9.8 9.8 0 0 0 3.2-.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                              `;
                    });
                });
        }


        // =========================================================
        // INICIAR APLICAÇÃO
        // =========================================================

        async function iniciarAplicacao() {

            // =============================================
            // CONFIGURA LOGIN
            // =============================================

            configurarLoginAdmin();


            configurarVisualizacaoSenha();


            configurarRecuperacaoSenha();


            configurarCriacaoSenha();


            // =============================================
            // CARREGAR PAINEL
            // =============================================

            const carregou =
                await carregarDadosSupabase();


            if (!carregou) {

                return;
            }


            atualizarResumoETabela();


            criarGrafico();


            configurarEdicaoCards();


            configurarEdicaoTabela();


            configurarResumoPrincipal();


            configurarCardsDinamicos();


            configurarTitulosEditaveis();


            configurarInformacoesAdicionais();


            // =============================================
            // VERIFICAR ADMIN
            // =============================================

            await iniciarAdmin();
        }


        // =========================================================
        // EXECUTAR
        // =========================================================

        iniciarAplicacao();
