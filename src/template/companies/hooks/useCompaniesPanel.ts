import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { companiesService } from "../services";
import type { Company, User } from "../types";

const QUERY_KEYS = {
  companies: ["companies"] as const,
  companyUsers: ["companies", "users"] as const,
  companyConfig: ["companies", "config"] as const,
};

const DEFAULT_LOAD_ERROR = "Error al cargar compañías";

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

interface UseCompaniesPanelReturn {
  companies: Company[];
  selectedCompany: Company | null;
  companyUsers: User[];
  loading: boolean;
  loadingUsers: boolean;
  error: string | null;
  loadCompanies: () => Promise<void>;
  handleCompanyClick: (company: Company) => Promise<void>;
  companyConfig: Company | null;
  loadCompanyConfig: (companyId: number) => Promise<void>;
}

export function useCompaniesPanel(initialCompanyId?: number): UseCompaniesPanelReturn {
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companyConfigId, setCompanyConfigId] = useState<number | null>(null);
  const activeCompanyConfigId = companyConfigId ?? initialCompanyId ?? null;

  const companiesQuery = useQuery({
    queryKey: [...QUERY_KEYS.companies],
    queryFn: () => companiesService.getAllCompanies(),
    staleTime: 30 * 1000,
  });

  const companyUsersQuery = useQuery({
    queryKey: [...QUERY_KEYS.companyUsers, selectedCompany?.id],
    queryFn: () => companiesService.getCompanyUsers(selectedCompany!.id),
    enabled: Boolean(selectedCompany?.id),
    staleTime: 30 * 1000,
  });

  const companyConfigQuery = useQuery({
    queryKey: [...QUERY_KEYS.companyConfig, activeCompanyConfigId],
    queryFn: () => companiesService.getCompanyDetails(activeCompanyConfigId!),
    enabled: Boolean(activeCompanyConfigId),
    staleTime: 30 * 1000,
  });

  const loadCompanyConfig = useCallback(async (companyId: number) => {
    setCompanyConfigId(companyId);
  }, []);

  const handleCompanyClick = useCallback(async (company: Company) => {
    setSelectedCompany(company);
  }, []);

  const loadCompanies = useCallback(async () => {
    await companiesQuery.refetch();
  }, [companiesQuery]);

  const error = companiesQuery.error
    ? getErrorMessage(companiesQuery.error, DEFAULT_LOAD_ERROR)
    : null;

  return {
    companies: companiesQuery.data ?? [],
    selectedCompany,
    companyUsers: companyUsersQuery.data ?? [],
    loading: companiesQuery.isLoading || companiesQuery.isFetching,
    loadingUsers: companyUsersQuery.isFetching,
    companyConfig: companyConfigQuery.data ?? null,
    error,
    loadCompanies,
    handleCompanyClick,
    loadCompanyConfig,
  };
}
