import { useState, useCallback, useMemo } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useRole } from "@/context/role";
import { companiesService, type CreateUserForEmpresaDto } from "../services";
import type { Empresa, UsuarioEmpresa, DispositivoEmpresa } from "../types";

const QUERY_KEYS = {
  companies: ["companies"] as const,
  users: ["companies", "users"] as const,
  devices: ["companies", "devices"] as const,
};

export function useCompaniesPanel() {
  const { isSuperAdmin, idEmpresa } = useRole();
  const queryClient = useQueryClient();
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);

  const companiesQuery = useQuery({
    queryKey: QUERY_KEYS.companies,
    queryFn: () => companiesService.getEmpresas(),
    staleTime: 60_000,
  });

  const usersQuery = useQuery({
    queryKey: QUERY_KEYS.users,
    queryFn: () => companiesService.getEmpresaUsers(),
    enabled: Boolean(isSuperAdmin || idEmpresa !== null),
    staleTime: 30_000,
  });

  const devicesQuery = useQuery({
    queryKey: QUERY_KEYS.devices,
    queryFn: () => companiesService.getEmpresaDispositivos(),
    enabled: Boolean(isSuperAdmin || idEmpresa !== null),
    staleTime: 30_000,
  });

  const createCompanyMut = useMutation({
    mutationFn: (empresa: Omit<Empresa, "id">) => companiesService.createEmpresa(empresa),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.companies });
    },
  });

  const createUserMut = useMutation({
    mutationFn: (userData: CreateUserForEmpresaDto) => companiesService.createUserForEmpresa(userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users });
    },
  });

  const companies = companiesQuery.data ?? [];
  const allUsers = usersQuery.data ?? [];
  const allDevices = devicesQuery.data ?? [];

  const selectedCompany = useMemo(
    () => companies.find((c) => c.id === selectedCompanyId) ?? null,
    [companies, selectedCompanyId],
  );

  const companyUsers = useMemo(
    () => allUsers.filter((u) => u.idEmpresa === selectedCompanyId),
    [allUsers, selectedCompanyId],
  );

  const companyDevices = useMemo(
    () => allDevices.filter((d) => d.id_empresa === selectedCompanyId),
    [allDevices, selectedCompanyId],
  );

  const handleCompanyClick = useCallback((company: Empresa) => {
    setSelectedCompanyId(company.id);
  }, []);

  const handleCreateCompany = useCallback(async (empresa: Omit<Empresa, "id">) => {
    await createCompanyMut.mutateAsync(empresa);
    setSelectedCompanyId(undefined as unknown as number);
  }, []);

  const handleCreateUser = useCallback(async (userData: CreateUserForEmpresaDto) => {
    await createUserMut.mutateAsync(userData);
  }, []);

  return {
    companies,
    selectedCompany,
    companyUsers,
    companyDevices,
    allUsers,
    allDevices,
    loading: companiesQuery.isLoading,
    loadingUsers: usersQuery.isFetching,
    loadingDevices: devicesQuery.isFetching,
    error: companiesQuery.error as Error | null,
    isSuperAdmin,
    createCompanyMut,
    createUserMut,
    loadCompanies: () => companiesQuery.refetch(),
    handleCompanyClick,
    handleCreateCompany,
    handleCreateUser,
    setSelectedCompanyId,
  };
}