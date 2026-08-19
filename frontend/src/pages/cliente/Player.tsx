import { ArrowLeft, Play, SkipForward, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactPlayer from "react-player";
import { useNavigate, useParams } from "react-router-dom";

import { useClienteAuth } from "@/auth/ClienteAuthContext";
import { FullscreenLoader } from "@/components/ui/FullscreenLoader";
import { useEpisodioPlayer, useSalvarProgresso } from "@/hooks/usePlayer";
import { getAccessToken } from "@/lib/tokenStorage";

const INTERVALO_SALVAR_MS = 10_000;
const LIMIAR_CONCLUIDO_SEGUNDOS = 15;
const CONTAGEM_PROXIMO_SEGUNDOS = 8;

export function Player() {
  const { id } = useParams<{ id: string }>();
  const episodioId = Number(id);
  const navigate = useNavigate();

  const { data: episodio, isLoading } = useEpisodioPlayer(episodioId);
  const salvarProgresso = useSalvarProgresso();
  const { cliente } = useClienteAuth();
  // Progresso é um dado pessoal do cliente — sem essa sessão (ex: admin pré-visualizando),
  // não há onde persistir, então nem tenta.
  const podeSalvarProgresso = !!cliente;

  const playerRef = useRef<HTMLVideoElement>(null);
  const tempoAtualRef = useRef(0);
  const jaFezSeekRef = useRef(false);
  const [erroPlayer, setErroPlayer] = useState(false);
  const [contagemProximo, setContagemProximo] = useState<number | null>(null);

  // Muda de episódio (o mesmo componente é reaproveitado pela rota /assistir/:id) —
  // reseta o estado que não deve sobreviver à troca.
  useEffect(() => {
    jaFezSeekRef.current = false;
    tempoAtualRef.current = 0;
    setErroPlayer(false);
    setContagemProximo(null);
  }, [episodioId]);

  useEffect(() => {
    if (!episodio || !podeSalvarProgresso) return;
    const intervalo = setInterval(() => {
      if (tempoAtualRef.current > 0) {
        salvarProgresso.mutate({
          episodio_id: episodio.id,
          segundos_assistidos: Math.floor(tempoAtualRef.current),
          concluido: false,
        });
      }
    }, INTERVALO_SALVAR_MS);
    return () => clearInterval(intervalo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episodio?.id]);

  useEffect(() => {
    if (contagemProximo === null || !episodio?.proximo_episodio) return;
    if (contagemProximo <= 0) {
      navigate(`/assistir/${episodio.proximo_episodio.id}`, { replace: true });
      return;
    }
    const timer = setTimeout(() => setContagemProximo((c) => (c === null ? null : c - 1)), 1000);
    return () => clearTimeout(timer);
  }, [contagemProximo, episodio?.proximo_episodio, navigate]);

  if (isLoading) return <FullscreenLoader />;
  if (!episodio) {
    return <div className="flex min-h-screen items-center justify-center text-white/60">Episódio não encontrado.</div>;
  }
  if (episodio.fonte === "youtube_embed" && !episodio.youtube_video_id) {
    return (
      <div className="flex min-h-screen items-center justify-center text-white/60">
        Este vídeo está indisponível no momento. Tente novamente mais tarde.
      </div>
    );
  }

  const src =
    episodio.fonte === "youtube_embed"
      ? `https://www.youtube.com/watch?v=${episodio.youtube_video_id}`
      : `/api/v1/episodios/${episodio.id}/stream?token=${getAccessToken("cliente") ?? getAccessToken("admin") ?? ""}`;

  function handleLoadedMetadata() {
    if (jaFezSeekRef.current || !playerRef.current || !episodio) return;
    jaFezSeekRef.current = true;
    if (episodio.segundos_assistidos > 5 && !episodio.concluido) {
      playerRef.current.currentTime = episodio.segundos_assistidos;
    }
  }

  function handleTimeUpdate(event: React.SyntheticEvent<HTMLVideoElement>) {
    tempoAtualRef.current = event.currentTarget.currentTime;
  }

  function handlePause() {
    if (!episodio || !podeSalvarProgresso) return;
    salvarProgresso.mutate({
      episodio_id: episodio.id,
      segundos_assistidos: Math.floor(tempoAtualRef.current),
      concluido: false,
    });
  }

  function handleEnded() {
    if (!episodio) return;
    if (podeSalvarProgresso) {
      const duracao = episodio.duracao_segundos ?? tempoAtualRef.current;
      salvarProgresso.mutate({
        episodio_id: episodio.id,
        segundos_assistidos: Math.floor(duracao),
        concluido: true,
      });
    }
    if (episodio.proximo_episodio) {
      setContagemProximo(CONTAGEM_PROXIMO_SEGUNDOS);
    }
  }

  function handleAntesDeSair() {
    if (!episodio || !podeSalvarProgresso || tempoAtualRef.current <= 0) return;
    const duracao = episodio.duracao_segundos ?? 0;
    const concluido = duracao > 0 && duracao - tempoAtualRef.current <= LIMIAR_CONCLUIDO_SEGUNDOS;
    salvarProgresso.mutate({
      episodio_id: episodio.id,
      segundos_assistidos: Math.floor(tempoAtualRef.current),
      concluido,
    });
  }

  const proximo = episodio.proximo_episodio;

  return (
    <div className="flex min-h-screen flex-col bg-black">
      <div className="flex items-center justify-between gap-3 p-4 text-white">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              handleAntesDeSair();
              navigate(-1);
            }}
            className="text-white/70 hover:text-white"
          >
            <ArrowLeft size={22} />
          </button>
          <div>
            <p className="text-xs text-white/50">{episodio.serie_titulo}</p>
            <h1 className="font-semibold">{episodio.titulo}</h1>
          </div>
        </div>

        {proximo && (
          <button
            onClick={() => navigate(`/assistir/${proximo.id}`)}
            className="flex shrink-0 items-center gap-2 rounded bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/20"
          >
            Próximo episódio
            <SkipForward size={16} />
          </button>
        )}
      </div>

      <div className="relative flex-1 bg-black">
        {erroPlayer ? (
          <div className="absolute inset-0 flex items-center justify-center text-center text-white/60">
            Não foi possível reproduzir este vídeo. Tente novamente mais tarde.
          </div>
        ) : (
          <ReactPlayer
            ref={playerRef}
            src={src}
            controls
            autoPlay
            width="100%"
            height="100%"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }}
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            onPause={handlePause}
            onEnded={handleEnded}
            onError={() => setErroPlayer(true)}
          />
        )}

        {contagemProximo !== null && proximo && (
          <div className="absolute bottom-6 right-6 flex w-72 flex-col overflow-hidden rounded bg-surface shadow-2xl">
            <div className="relative aspect-video w-full bg-black/40">
              {proximo.thumbnail_url && (
                <img src={proximo.thumbnail_url} alt="" className="h-full w-full object-cover" />
              )}
              <button
                onClick={() => setContagemProximo(null)}
                className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white/80 hover:text-white"
                title="Cancelar"
              >
                <X size={14} />
              </button>
            </div>
            <div className="p-3 text-white">
              <p className="text-xs text-white/50">Próximo episódio em {contagemProximo}s</p>
              <p className="truncate text-sm font-medium">
                {proximo.numero !== null && <span className="text-white/50">#{proximo.numero} </span>}
                {proximo.titulo}
              </p>
              <button
                onClick={() => navigate(`/assistir/${proximo.id}`, { replace: true })}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded bg-brand py-2 text-sm font-semibold hover:bg-brand-dark"
              >
                <Play size={14} className="fill-white" />
                Assistir agora
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
