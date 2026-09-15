/* ==========================================================================
   MODO DEMONSTRAÇÃO — dados sintéticos ROTULADOS.
   Usado apenas quando VITE_DEMO=true, para ver o produto sem o backend.
   A interface mostra um selo "DEMO" quando este modo está ativo.
   Nunca misturar com dados reais.
   ========================================================================== */

import type { Chamado, Comentario, Usuario } from './types';

export const demoUsuarios: Usuario[] = [
  {
    id: 1,
    username: 'mariana.andrade',
    email: 'mariana@empresa.com.br',
    role: 'analista',
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    username: 'carlos.menezes',
    email: 'carlos@empresa.com.br',
    role: 'admin',
    created_at: new Date().toISOString(),
  },
  {
    id: 3,
    username: 'julia.rocha',
    email: 'julia@empresa.com.br',
    role: 'usuario',
    created_at: new Date().toISOString(),
  },
  {
    id: 4,
    username: 'rafael.duarte',
    email: 'rafael@empresa.com.br',
    role: 'usuario',
    created_at: new Date().toISOString(),
  },
  {
    id: 5,
    username: 'beatriz.lima',
    email: 'beatriz@empresa.com.br',
    role: 'analista',
    created_at: new Date().toISOString(),
  },
];

function h(horasAtras: number): string {
  return new Date(Date.now() - horasAtras * 3600_000).toISOString();
}

export const demoChamados: Chamado[] = [
  {
    id: 1042,
    title: 'Notebook não inicia após atualização do Windows',
    description:
      'Após a atualização de ontem à noite, o notebook do financeiro não sobe além da tela de login. Tela preta após inserir a senha. Já tentei reiniciar três vezes e o problema persiste.',
    status: 'Em andamento',
    priority: 'Alta',
    category: 'Hardware',
    created_at: h(2),
    updated_at: h(1),
    autor_do_chamado: 'julia.rocha',
    responsavel: 'mariana.andrade',
    autor_role: 'usuario',
  },
  {
    id: 1041,
    title: 'Sem acesso à rede sem fio no 3º andar',
    description:
      'O Wi-Fi caiu em todo o 3º andar desde as 9h. Os colegas confirmam que a rede "Corp-5G" não aparece em nenhum dispositivo.',
    status: 'Aberto',
    priority: 'Alta',
    category: 'Rede',
    created_at: h(4),
    updated_at: h(4),
    autor_do_chamado: 'rafael.duarte',
    responsavel: null,
    autor_role: 'usuario',
  },
  {
    id: 1040,
    title: 'Solicitar instalação do pacote Office',
    description:
      'Cheguei hoje na empresa e o notebook veio sem o pacote Office instalado. Preciso para as planilhas do dia a dia.',
    status: 'Resolvido',
    priority: 'Baixa',
    category: 'Software',
    created_at: h(26),
    updated_at: h(20),
    autor_do_chamado: 'julia.rocha',
    responsavel: 'beatriz.lima',
    autor_role: 'usuario',
  },
  {
    id: 1039,
    title: 'Impressora do setor comercial sem toner',
    description:
      'A impressora HP da sala 214 indica toner esgotado. Fazemos muitos relatórios por dia e ficamos sem imprimir.',
    status: 'Aberto',
    priority: 'Média',
    category: 'Hardware',
    created_at: h(30),
    updated_at: h(30),
    autor_do_chamado: 'rafael.duarte',
    responsavel: null,
    autor_role: 'usuario',
  },
  {
    id: 1038,
    title: 'Acesso ao sistema de vendas expirou',
    description:
      'Meu acesso ao CRM de vendas expirou e o botão de redefinir não envia o e-mail de recuperação.',
    status: 'Em andamento',
    priority: 'Média',
    category: 'Software',
    created_at: h(49),
    updated_at: h(45),
    autor_do_chamado: 'julia.rocha',
    responsavel: 'mariana.andrade',
    autor_role: 'usuario',
  },
  {
    id: 1037,
    title: 'Videoconferência sem áudio na sala de reunião 2',
    description:
      'O equipamento da sala 2 conecta, mas o áudio não sai nos alto-falantes. Já verificamos cabo e conexão Bluetooth.',
    status: 'Resolvido',
    priority: 'Média',
    category: 'Hardware',
    created_at: h(70),
    updated_at: h(66),
    autor_do_chamado: 'rafael.duarte',
    responsavel: 'beatriz.lima',
    autor_role: 'usuario',
  },
];

export const demoComentarios: Record<number, Comentario[]> = {
  1042: [
    {
      id: 1,
      message:
        'Olá, Julia. Vamos checar o registro de eventos do sistema. Consegue me dizer o modelo exato do notebook?',
      created_at: h(1.5),
      autor_do_comentario: 'mariana.andrade',
      perfil_do_autor: 'analista',
    },
    {
      id: 2,
      message: 'É o Dell Latitude 5420. O problema começou exatamente após a atualização de ontem.',
      created_at: h(1.2),
      autor_do_comentario: 'julia.rocha',
      perfil_do_autor: 'usuario',
    },
  ],
  1041: [
    {
      id: 1,
      message:
        'Vou acionar o fornecedor do switch do 3º andar agora mesmo. Enquanto isso, pode usar a rede visitante "Corp-Eventos".',
      created_at: h(3.5),
      autor_do_comentario: 'mariana.andrade',
      perfil_do_autor: 'analista',
    },
  ],
  1038: [
    {
      id: 1,
      message:
        'Redefini o acesso manualmente, Julia. Tenta logar com a mesma senha dentro de 30 min.',
      created_at: h(46),
      autor_do_comentario: 'mariana.andrade',
      perfil_do_autor: 'analista',
    },
  ],
};

export const demoLoading = false;
