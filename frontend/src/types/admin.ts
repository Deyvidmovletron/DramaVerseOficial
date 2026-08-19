export interface Categoria {
  id: number;
  nome: string;
}

export type StatusSerie = "rascunho" | "publicado";

export interface Serie {
  id: number;
  titulo: string;
  sinopse: string | null;
  categoria: Categoria | null;
  capa_url: string | null;
  banner_url: string | null;
  ano: number | null;
  status: StatusSerie;
  criado_em: string;
  total_episodios: number;
}

export interface SerieInput {
  titulo: string;
  sinopse: string | null;
  categoria_id: number | null;
  ano: number | null;
  status: StatusSerie;
}

export interface Paginado<T> {
  itens: T[];
  total: number;
  pagina: number;
  total_paginas: number;
}

export interface Temporada {
  id: number;
  serie_id: number;
  numero: number;
  titulo: string | null;
}

export interface TemporadaInput {
  numero: number;
  titulo: string | null;
}

export type FonteEpisodio = "youtube_embed" | "youtube_baixado" | "local" | "panda";
export type StatusProcessamento = "pronto" | "pendente" | "baixando" | "erro";

export interface Episodio {
  id: number;
  serie_id: number;
  temporada_id: number | null;
  numero: number | null;
  titulo: string;
  descricao: string | null;
  thumbnail_url: string | null;
  duracao_segundos: number | null;
  ordem: number;
  fonte: FonteEpisodio;
  youtube_video_id: string | null;
  status_processamento: StatusProcessamento;
  criado_em: string;
}

export interface EpisodioUpdateInput {
  titulo: string;
  descricao: string | null;
  numero: number | null;
  temporada_id: number | null;
}

export interface PlaylistVideo {
  video_id: string;
  titulo: string;
  thumbnail_url: string | null;
  duracao_segundos: number | null;
  ja_importado: boolean;
}

export interface PlaylistPreview {
  playlist_url: string;
  playlist_titulo: string | null;
  playlist_thumbnail_url: string | null;
  total_encontrados: number;
  videos: PlaylistVideo[];
}

export interface ImportacaoPlaylist {
  id: number;
  serie_id: number;
  playlist_url: string;
  total_encontrados: number;
  total_importados: number;
  status: "processando" | "concluida" | "erro";
  criado_em: string;
}

export interface Plano {
  id: number;
  nome: string;
  descricao: string | null;
  preco_centavos: number;
  duracao_dias: number;
  ativo: boolean;
  criado_em: string;
}

export interface PlanoInput {
  nome: string;
  descricao: string | null;
  preco_centavos: number;
  duracao_dias: number;
  ativo: boolean;
}

export type StatusClienteConta = "ativo" | "bloqueado";

export interface ClienteAdmin {
  id: number;
  nome: string;
  email: string;
  status: StatusClienteConta;
  criado_em: string;
  plano_atual_id: number | null;
  plano_atual: string | null;
  assinatura_status: string | null;
  data_expiracao: string | null;
}

export interface ClienteCreateInput {
  nome: string;
  email: string;
  senha: string;
  plano_id: number | null;
}

export interface ClienteUpdateInput {
  nome: string;
  email: string;
  status: StatusClienteConta;
}

export type StatusAssinaturaAdmin = "pendente" | "ativa" | "atrasada" | "cancelada";

export interface AssinaturaAdmin {
  id: number;
  cliente_id: number;
  cliente_nome: string;
  cliente_email: string;
  plano_id: number;
  plano_nome: string;
  status: StatusAssinaturaAdmin;
  data_inicio: string | null;
  data_expiracao: string | null;
  data_proximo_pagamento: string | null;
  mp_subscription_id: string | null;
  criado_em: string;
}

export interface AssinaturaUpdateInput {
  status: StatusAssinaturaAdmin;
  plano_id?: number;
  data_inicio?: string | null;
  data_expiracao: string | null;
}

export interface AssinaturaCreateInput {
  cliente_id: number;
  plano_id: number;
  status: StatusAssinaturaAdmin;
  data_inicio?: string | null;
  data_expiracao?: string | null;
}
