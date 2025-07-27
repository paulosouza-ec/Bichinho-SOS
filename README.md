Bichinho-SOS  (AINDA EM DESENVOLVIMENTO !! ) é um aplicativo móvel desenvolvido em React Native com um backend em Node.js/Express, projetado para ser uma plataforma colaborativa onde os usuários podem registrar, visualizar e interagir com denúncias sobre animais em situações de risco, como abandono, maus-tratos ou que necessitem de resgate.

O objetivo é centralizar informações e engajar a comunidade na proteção dos animais.

✨ Principais Funcionalidades
- 
👤 Autenticação e Perfil de Usuário
Cadastro e Login: Sistema completo de autenticação para que os usuários possam criar e acessar suas contas de forma segura. O cadastro inclui campos como nome, e-mail, telefone e um nickname único.

Perfil Personalizável: Cada usuário possui uma tela de perfil onde pode visualizar suas informações, foto, e editar uma biografia.

Estatísticas do Usuário: O perfil exibe estatísticas de engajamento, como o número de denúncias criadas, o total de curtidas recebidas em suas publicações e a quantidade de comentários feitos.

Minhas Denúncias: A tela de perfil lista todas as denúncias criadas pelo usuário, com a opção de gerenciá-las (excluir).

📢 Sistema de Denúncias
Criação de Denúncias: Usuários podem criar novas denúncias fornecendo título, descrição detalhada, localização e uma foto do ocorrido.

Denúncia Anônima: Há a opção de registrar uma denúncia de forma anônima para proteger a identidade do denunciante.

Feed Principal: A tela inicial exibe um feed com todas as denúncias publicadas, ordenadas das mais recentes para as mais antigas.

Filtros e Busca: O feed pode ser filtrado para exibir "Todas as Denúncias" ou apenas as "Minhas Denúncias". Além disso, é possível filtrar por denúncias anônimas ou identificadas e buscar por palavras-chave no título ou na descrição.

❤️ Interação Social e Engajamento
Sistema de Curtidas: Usuários podem curtir as denúncias para demonstrar apoio e aumentar a visibilidade do caso.

Seção de Comentários Completa:

É possível adicionar comentários em cada denúncia.

O sistema suporta respostas a comentários (threads/aninhamento).

Usuários podem editar e excluir seus próprios comentários, dando total controle sobre suas interações.

Detalhes da Denúncia: Uma tela dedicada exibe todas as informações de uma denúncia, incluindo a imagem, descrição completa, e a seção de comentários.

🛠️ Arquitetura e Tecnologias
Frontend: Desenvolvido em React Native com Expo, garantindo uma experiência de usuário fluida e multiplataforma (iOS/Android).

Backend: Construído com Node.js e Express.js, fornecendo uma API RESTful para gerenciar dados de usuários, denúncias e interações.

Banco de Dados: Utiliza PostgreSQL para persistência e gerenciamento dos dados da aplicação.
