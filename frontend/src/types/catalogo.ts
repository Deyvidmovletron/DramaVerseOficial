export interface Categoria {
  id: number;
  nome: string;
}

export interface SerieCard {
  id: number;
  titulo: string;
  sinopse: string | null;
  capa_url: string | null;
  banner_url: string | null;
  ano: number | null;
}

export interface Carrossel {
  categoria: string;
  categoria_id: number | null;
  series: SerieCard[];
}

export interface ContinuarAssistindo {
  episodio_id: number;
  serie_id: number;
  serie_titulo: string;
  episodio_titulo: string;
  thumbnail_url: string | null;
  duracao_segundos: number | null;
  segundos_assistidos: number;
}

export interface Home {
  destaques: SerieCard[];
  continuar_assistindo: ContinuarAssistindo[];
  carrosseis: Carrossel[];
}

export type FonteEpisodio = "youtube_embed" | "youtube_baixado" | "local" | "panda";

export interface EpisodioCatalogo {
  id: number;
  numero: number | null;
  titulo: string;
  descricao: string | null;
  thumbnail_url: string | null;
  duracao_segundos: number | null;
  ordem: number;
  fonte: FonteEpisodio;
  youtube_video_id: string | null;
}

export interface SerieDetalhe {
  id: number;
  titulo: string;
  sinopse: string | null;
  capa_url: string | null;
  banner_url: string | null;
  ano: number | null;
  categoria: string | null;
  na_minha_lista: boolean;
  episodios: EpisodioCatalogo[];
}

export interface ProximoEpisodio {
  id: number;
  numero: number | null;
  titulo: string;
  thumbnail_url: string | null;
}

export interface EpisodioPlayer extends EpisodioCatalogo {
  serie_id: number;
  serie_titulo: string;
  segundos_assistidos: number;
  concluido: boolean;
  proximo_episodio: ProximoEpisodio | null;
}

export interface PlanoPublico {
  id: number;
  nome: string;
  descricao: string | null;
  preco_centavos: number;
  duracao_dias: number;
}

export interface CheckoutCartaoResultado {
  assinatura_id: number;
  status: "ativa" | "pendente" | "recusada";
  mensagem: string | null;
  data_expiracao: string | null;
}

export interface CheckoutPixResultado {
  assinatura_id: number;
  payment_id: string;
  qr_code: string | null;
  qr_code_base64: string | null;
}

export interface VerificarPagamentoResultado {
  status: "aprovado" | "pendente";
  ativa: boolean;
  data_expiracao: string | null;
}
