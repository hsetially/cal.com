"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { TeamOrgFeaturesSettings } from "@calcom/features/feature-opt-in/components/TeamOrgFeaturesSettings";

interface OrganizationFeaturesViewProps {
  organizationId: number;
}

const OrganizationFeaturesView = ({ organizationId }: OrganizationFeaturesViewProps) => {
  const { t } = useLocale();

  return (
    <SettingsHeader
      title={t("feature_opt_in")}
      description={t("feature_opt_in_org_description")}
      borderInShellHeader={true}>
      <TeamOrgFeaturesSettings entityId={organizationId} entityType="organization" />
    </SettingsHeader>
  );
};

export default OrganizationFeaturesView;
