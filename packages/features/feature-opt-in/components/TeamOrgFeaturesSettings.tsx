"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Alert } from "@calcom/ui/components/alert";
import { ToggleGroup } from "@calcom/ui/components/form";
import { SettingsToggle } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { SkeletonText } from "@calcom/ui/components/skeleton";

import type { FeatureState } from "@calcom/features/flags/config";
import { getOptInFeatureConfig } from "../config";

interface TeamOrgFeaturesSettingsProps {
  entityId: number;
  entityType: "team" | "organization";
}

export const TeamOrgFeaturesSettings = ({ entityId, entityType }: TeamOrgFeaturesSettingsProps) => {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const featuresQuery =
    entityType === "organization"
      ? trpc.viewer.featureOptIn.listForOrganization.useQuery()
      : trpc.viewer.featureOptIn.listForTeam.useQuery({ teamId: entityId });

  const autoOptInQuery =
    entityType === "organization"
      ? trpc.viewer.featureOptIn.getOrganizationAutoOptIn.useQuery()
      : trpc.viewer.featureOptIn.getTeamAutoOptIn.useQuery({ teamId: entityId });

  const setStateMutation =
    entityType === "organization"
      ? trpc.viewer.featureOptIn.setOrganizationState.useMutation({
          onSuccess: () => {
            utils.viewer.featureOptIn.listForOrganization.invalidate();
            showToast(t("settings_updated_successfully"), "success");
          },
          onError: () => {
            showToast(t("error_updating_settings"), "error");
          },
        })
      : trpc.viewer.featureOptIn.setTeamState.useMutation({
          onSuccess: () => {
            utils.viewer.featureOptIn.listForTeam.invalidate({ teamId: entityId });
            showToast(t("settings_updated_successfully"), "success");
          },
          onError: () => {
            showToast(t("error_updating_settings"), "error");
          },
        });

  const setAutoOptInMutation =
    entityType === "organization"
      ? trpc.viewer.featureOptIn.setOrganizationAutoOptIn.useMutation({
          onSuccess: () => {
            utils.viewer.featureOptIn.getOrganizationAutoOptIn.invalidate();
            showToast(t("settings_updated_successfully"), "success");
          },
          onError: () => {
            showToast(t("error_updating_settings"), "error");
          },
        })
      : trpc.viewer.featureOptIn.setTeamAutoOptIn.useMutation({
          onSuccess: () => {
            utils.viewer.featureOptIn.getTeamAutoOptIn.invalidate({ teamId: entityId });
            showToast(t("settings_updated_successfully"), "success");
          },
          onError: () => {
            showToast(t("error_updating_settings"), "error");
          },
        });

  const handleStateChange = (featureId: string, state: FeatureState) => {
    if (entityType === "organization") {
      setStateMutation.mutate({ featureId, state });
    } else {
      setStateMutation.mutate({ teamId: entityId, featureId, state });
    }
  };

  const handleAutoOptInChange = (checked: boolean) => {
    if (entityType === "organization") {
      setAutoOptInMutation.mutate({ autoOptIn: checked });
    } else {
      setAutoOptInMutation.mutate({ teamId: entityId, autoOptIn: checked });
    }
  };

  if (featuresQuery.isLoading || autoOptInQuery.isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonText className="h-8 w-full" />
        <SkeletonText className="h-8 w-full" />
      </div>
    );
  }

  const features = featuresQuery.data ?? [];
  const autoOptIn = autoOptInQuery.data?.autoOptIn ?? false;

  const toggleOptions = [
    { value: "enabled", label: t("allow") },
    { value: "disabled", label: t("block") },
    { value: "inherit", label: t("let_users_decide") },
  ];

  return (
    <div className="space-y-6">
      {features.length === 0 ? (
        <Alert severity="neutral" title={t("no_opt_in_features_available")} />
      ) : (
        <div className="space-y-6">
          {features.map((feature) => {
            const config = getOptInFeatureConfig(feature.featureId);
            const title = config?.titleI18nKey ? t(config.titleI18nKey) : feature.featureId;
            const description = config?.descriptionI18nKey ? t(config.descriptionI18nKey) : "";

            return (
              <div key={feature.featureId} className="border-subtle rounded-lg border p-4">
                <div className="mb-3">
                  <h3 className="text-emphasis text-sm font-medium">{title}</h3>
                  {description && <p className="text-subtle text-sm">{description}</p>}
                </div>
                <ToggleGroup
                  value={feature.teamState}
                  onValueChange={(val) => handleStateChange(feature.featureId, val as FeatureState)}
                  options={toggleOptions}
                />
              </div>
            );
          })}
        </div>
      )}

      <SettingsToggle
        toggleSwitchAtTheEnd={true}
        title={t("auto_opt_in_experimental")}
        description={t("auto_opt_in_experimental_description")}
        disabled={setAutoOptInMutation.isPending}
        checked={autoOptIn}
        onCheckedChange={handleAutoOptInChange}
        switchContainerClassName="mt-6"
      />
    </div>
  );
};

export default TeamOrgFeaturesSettings;
