# Notas de Manutenção de Embalagem

Dashboard web para acompanhamento das notas de manutenção de embalagem, com visualização gráfica, detalhamento por linha e área administrativa para atualização das informações.

O projeto utiliza **HTML, CSS, JavaScript, Chart.js e Supabase**, com os dados armazenados em banco e carregados dinamicamente na aplicação.

## Funcionalidades

- Visualização geral das notas por categoria:
  - Amarelas
  - Vermelhas
  - ND
  - Total geral
- Gráfico interativo por linha.
- Detalhamento individual das linhas.
- Indicadores personalizados por linha.
- Cálculo de melhoria em relação ao valor inicial.
- Informações adicionais configuráveis.
- Títulos personalizáveis.
- Área administrativa protegida por autenticação.

## Estrutura do projeto

```text
manutencao/
├── css/
│   ├── style.css
│   └── admin.css
│
├── img/
│   └── logo.png
│
├── js/
│   ├── index.js
│   └── admin.js
│
├── supabase/
│   └── config.js
│
├── admin.html
├── index.html
├── login.html
├── original.html
├── LICENSE
└── README.md
```

## Organização

### `index.html`

Página pública do dashboard.

Exibe o gráfico, os indicadores gerais, o detalhamento das linhas e as informações cadastradas no painel administrativo.

### `admin.html`

Área administrativa da aplicação.

Permite atualizar os dados das linhas, editar indicadores, alterar títulos e gerenciar as informações adicionais exibidas no dashboard.

### `login.html`

Página de entrada para acesso à área administrativa.

Redireciona para o painel administrativo preservando os parâmetros utilizados pelo fluxo de autenticação do Supabase.

### `css/`

Responsável pela estilização da aplicação.

- `style.css`: estilos da página pública.
- `admin.css`: estilos e componentes específicos da área administrativa.

### `js/`

Contém a lógica da aplicação.

- `index.js`: carregamento dos dados, gráfico, cards e interações da página pública.
- `admin.js`: autenticação, edição dos dados e funcionalidades administrativas.

### `supabase/`

Contém a configuração utilizada para conexão com o Supabase.

- `config.js`: inicialização do cliente Supabase compartilhado pela aplicação.

### `img/`

Arquivos de imagem utilizados pelo projeto.

A logo principal deve ser adicionada como:

```text
img/logo.png
```

### `original.html`

Arquivo mantido como referência da versão anterior da página pública antes da reorganização da estrutura do projeto.

## Tecnologias utilizadas

- HTML5
- CSS3
- JavaScript
- Chart.js
- Supabase
- Git
- GitHub
- GitHub Pages

## Banco de dados

Os dados exibidos no dashboard são armazenados no Supabase.

A aplicação utiliza principalmente as tabelas responsáveis pelos dados gerais do painel e pelas informações adicionais de cada linha.

As alterações realizadas pela área administrativa são persistidas diretamente no banco, permitindo que a página pública apresente sempre os dados mais recentes.

## Área administrativa

O acesso administrativo utiliza o sistema de autenticação do Supabase.

Usuários autorizados podem:

- atualizar valores das linhas;
- editar indicadores;
- alterar títulos;
- adicionar informações complementares;
- editar ou excluir informações existentes;
- ocultar e restaurar determinados cards.

As permissões de alteração são controladas através das políticas de segurança do Supabase.

## Página pública

A página pública não exige autenticação e pode ser acessada através do:

```text
index.html
```

Ela possui apenas acesso de leitura aos dados disponibilizados pelo Supabase.

## Deploy

O projeto pode ser publicado como uma aplicação estática através do **GitHub Pages**.

Como o arquivo `index.html` está localizado na raiz do projeto, ele é utilizado automaticamente como página inicial.

A área administrativa pode ser acessada através de:

```text
/admin.html
```

## Objetivo do projeto

Centralizar e facilitar o acompanhamento das notas de manutenção de embalagem, oferecendo uma visualização mais clara da situação de cada linha e permitindo que as informações sejam atualizadas de forma simples através de uma área administrativa.
