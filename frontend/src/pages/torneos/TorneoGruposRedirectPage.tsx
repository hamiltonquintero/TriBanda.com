import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { Fase } from '../../types';

export default function TorneoGruposRedirectPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: fases = [], isLoading } = useQuery<Fase[]>({
    queryKey: ['torneo-fases', id],
    queryFn: () => api.get(`/torneos/${id}/fases`).then((r) => r.data),
    enabled: !!id,
  });

  useEffect(() => {
    if (isLoading || !id) return;
    const fase = fases.find((f) => f.tipo === 'grupos') ?? fases[0];
    if (!fase) return;
    navigate(`/torneos/${id}/fases/${fase.id}/grupos`, { replace: true });
  }, [fases, id, isLoading, navigate]);

  return <p className="text-gray-500">Redirigiendo a la fase de grupos...</p>;
}
