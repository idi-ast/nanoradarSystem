import { useState, useCallback, useMemo } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { ApiError } from "@/apis";
import { useRole } from "@/context/role";
import { companiesService } from "../services";
import type {
  Empresa,
  CreateUserForEmpresaDto,
  UpdateEmpresaDto,
} from "../types";

const QUERY_KEYS = {
  companies: ["companies"] as const,
  users: ["companies", "users"] as const,
  devices: ["companies", "devices"] as const,
};

/** apiSystem solo usa errorData.message, pero FastAPI responde con `detail`,
 *  así que sin esto el usuario vería un inútil "Error 500". */
function detalleDeError(error: unknown): string | null {
  if (!(error instanceof ApiError)) {
    return error instanceof Error ? error.message : null;
  }
  const data = error.data as { detail?: unknown } | null;
  if (typeof data?.detail === "string") return data.detail;
  return error.message;
}

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

  const updateCompanyMut = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateEmpresaDto }) =>
      companiesService.updateEmpresa(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.companies });
    },
  });

  const deleteCompanyMut = useMutation({
    mutationFn: (id: number) => companiesService.deleteEmpresa(id),
    onSuccess: (_data, id) => {
      // La empresa desaparece de la lista: dejamos de seleccionarla para no
      // mostrar un detalle que ya no existe.
      setSelectedCompanyId((current) => (current === id ? null : current));
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.companies });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.devices });
    },
  });

  // La empresa principal se muestra primero. sort es estable, así que el resto
  // conserva el orden que devuelve el backend.
  const companies = useMemo(() => {
    const data = companiesQuery.data ?? [];
    return [...data].sort((a, b) => Number(!!b.principal) - Number(!!a.principal));
  }, [companiesQuery.data]);

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

  const handleUpdateCompany = useCallback(
    async (id: number, payload: UpdateEmpresaDto) => {
      await updateCompanyMut.mutateAsync({ id, payload });
    },
    [updateCompanyMut],
  );

  const handleDeleteCompany = useCallback(
    async (id: number) => {
      await deleteCompanyMut.mutateAsync(id);
    },
    [deleteCompanyMut],
  );

  const actionError =
    detalleDeError(updateCompanyMut.error) ??
    detalleDeError(deleteCompanyMut.error) ??
    detalleDeError(createCompanyMut.error) ??
    detalleDeError(createUserMut.error);

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
    actionError,
    isSuperAdmin,
    createCompanyMut,
    createUserMut,
    updateCompanyMut,
    deleteCompanyMut,
    loadCompanies: () => companiesQuery.refetch(),
    handleCompanyClick,
    handleCreateCompany,
    handleCreateUser,
    handleUpdateCompany,
    handleDeleteCompany,
    setSelectedCompanyId,
  };
}