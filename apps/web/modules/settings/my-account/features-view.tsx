"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Alert } from "@calcom/ui/components/alert";
import { ToggleGroup } from "@calcom/ui/components/form";
import { SettingsToggle } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { SkeletonText } from "@calcom/ui/components/skeleton";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

import type { FeatureState } from "@calcom/features/flags/config";
import { getOptInFeatureConfig } from "@calcom/features/feature-opt-in/config";

const FeaturesView = () => {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const featuresQuery = trpc.viewer.featureOptIn.listForUser.useQuery();
  const autoOptInQuery = trpc.viewer.featureOptIn.getUserAutoOptIn.useQuery();

  const setStateMutation = trpc.viewer.featureOptIn.setUserState.useMutation({
    onSuccess: () => {
      utils.viewer.featureOptIn.listForUser.invalidate();
      showToast(t("settings_updated_successfully"), "success");
    },
    onError: () => {
      showToast(t("error_updating_settings"), "error");
    },
  });

  const setAutoOptInMutation = trpc.viewer.featureOptIn.setUserAutoOptIn.useMutation({
    onSuccess: () => {
      utils.viewer.featureOptIn.getUserAutoOptIn.invalidate();
      showToast(t("settings_updated_successfully"), "success");
    },
    onError: () => {
      showToast(t("error_updating_settings"), "error");
    },
  });

  const handleStateChange = (featureId: string, state: FeatureState) => {
    setStateMutation.mutate({ featureId, state });
  };

  const handleAutoOptInChange = (checked: boolean) => {
    setAutoOptInMutation.mutate({ autoOptIn: checked });
  };

  if (featuresQuery.isLoading || autoOptInQuery.isLoading) {
    return (
      <SettingsHeader
        title={t("feature_opt_in")}
        description={t("feature_opt_in_description")}
        borderInShellHeader={true}>
        <div className="space-y-4">
          <SkeletonText className="h-8 w-full" />
          <SkeletonText className="h-8 w-full" />
        </div>
      </SettingsHeader>
    );
  }

  const features = featuresQuery.data ?? [];
  const autoOptIn = autoOptInQuery.data?.autoOptIn ?? false;

  const toggleOptions = [
    { value: "enabled", label: t("on") },
    { value: "disabled", label: t("off") },
    { value: "inherit", label: t("use_default") },
  ];

  return (
    <SettingsHeader
      title={t("feature_opt_in")}
      description={t("feature_opt_in_description")}
      borderInShellHeader={true}>
      <div className="space-y-6">
        {features.length === 0 ? (
          <Alert severity="neutral" title={t("no_opt_in_features_available")} />
        ) : (
          <div className="space-y-6">
            {features.map((feature) => {
              const config = getOptInFeatureConfig(feature.featureId);
              const title = config?.titleI18nKey ? t(config.titleI18nKey) : feature.featureId;
              const description = config?.descriptionI18nKey ? t(config.descriptionI18nKey) : "";

              const hasTeamBlock = feature.teamStates.some((ts) => ts.state === "disabled");
              const hasOrgBlock = feature.orgState === "disabled";
              const isBlocked = hasTeamBlock || hasOrgBlock;

              return (
                <div key={feature.featureId} className="border-subtle rounded-lg border p-4">
                  <div className="mb-3">
                    <h3 className="text-emphasis text-sm font-medium">{title}</h3>
                    {description && <p className="text-subtle text-sm">{description}</p>}
                  </div>
                  <ToggleGroup
                    value={feature.userState}
                    onValueChange={(val) => handleStateChange(feature.featureId, val as FeatureState)}
                    options={toggleOptions}
                  />
                  {isBlocked && feature.userState === "enabled" && (
                    <Alert
                      severity="warning"
                      title={hasOrgBlock ? t("feature_blocked_by_org_warning") : t("feature_blocked_by_team_warning")}
                      className="mt-3"
                    />
                  )}
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
    </SettingsHeader>
  );
};

export default FeaturesView;
