import { useEffect, useState, useCallback, useMemo } from 'react';
import { servicesPanelService } from '../services';
import type { Service } from '../types';

interface UseServicesPanelReturn {
  services: Service[];
  servicesByCompany: Record<string, Service[]>;
  loading: boolean;
  error: string | null;
  loadServices: () => Promise<void>;
}

export function useServicesPanel(): UseServicesPanelReturn {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadServices = useCallback(async () => {
    try {
      setLoading(true);
      const data = await servicesPanelService.getUserServices();
      setServices(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error al cargar servicios');
      console.error('Error loading services:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  // Agrupar servicios por compañía
  const servicesByCompany = useMemo(() => {
    return services.reduce((acc, service) => {
      const companyName = service.company_name || 'Sin compañía';
      if (!acc[companyName]) {
        acc[companyName] = [];
      }
      acc[companyName].push(service);
      return acc;
    }, {} as Record<string, Service[]>);
  }, [services]);

  return {
    services,
    servicesByCompany,
    loading,
    error,
    loadServices,
  };
}
