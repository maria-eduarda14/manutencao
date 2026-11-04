# Notas de Manutenção de Embalagem

Projeto reorganizado seguindo o mesmo padrão estrutural usado no projeto do gráfico de tendências.

## Estrutura

```text
manutencao/
├── css/
│   ├── style.css
│   └── admin.css
├── img/
│   ├── logo.png
│   └── README.md
├── js/
│   ├── index.js
│   └── admin.js
├── supabase/
│   └── config.js
├── admin.html
├── index.html
├── login.html
├── original.html
├── LICENSE
└── README.md
```

## Responsabilidades

### `index.html`
Estrutura da página pública.

### `admin.html`
Estrutura da área administrativa, incluindo os elementos usados no login, edição e gerenciamento do painel.

### `login.html`
Entrada alternativa para a área administrativa. Ele redireciona para `admin.html` e preserva parâmetros de autenticação do Supabase.

### `original.html`
Cópia da página pública antes da reorganização, mantida apenas como referência/backup.

### `css/style.css`
Estilos da página pública.

### `css/admin.css`
Estilos da área administrativa.

### `js/index.js`
Toda a lógica da página pública: carregamento dos dados, gráfico, cards, tabela e interações.

### `js/admin.js`
Lógica administrativa: autenticação, edição, cards dinâmicos, informações adicionais e demais interações.

### `supabase/config.js`
Configuração compartilhada do cliente Supabase.

### `img/`
Imagens do projeto. Coloque o arquivo `logo.png` aqui.

## Banco de dados

Nenhuma tabela, coluna, registro, usuário ou política RLS foi alterada nesta reorganização.

O projeto continua apontando para a mesma base Supabase e utiliza os mesmos nomes de tabelas e campos. Portanto, os dados existentes permanecem intactos.

## Logo

Adicione:

```text
img/logo.png
```

Os dois HTMLs já estão configurados para usar esse caminho.

## GitHub Pages

Como `index.html` continua na raiz, o projeto permanece compatível com GitHub Pages.

A área administrativa fica em:

```text
/admin.html
```

E a entrada alternativa de login em:

```text
/login.html
```
