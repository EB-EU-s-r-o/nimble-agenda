export interface ProviderLike {
  id: string;
  profile_id?: string | null;
}

export async function filterAssignableProviders<T extends ProviderLike>(params: {
  businessId: string;
  allowAdminProviders: boolean;
  providers: T[];
  fetchAdminProfileIds: (businessId: string) => Promise<string[]>;
}): Promise<T[]> {
  const { businessId, allowAdminProviders, providers, fetchAdminProfileIds } = params;

  if (allowAdminProviders) return providers;

  const adminProfileIds = new Set(await fetchAdminProfileIds(businessId));
  return providers.filter((provider) => !provider.profile_id || !adminProfileIds.has(provider.profile_id));
}
