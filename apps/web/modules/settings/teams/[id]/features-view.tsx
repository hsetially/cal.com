"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { TeamOrgFeaturesSettings } from "@calcom/features/feature-opt-in/components/TeamOrgFeaturesSettings";

interface TeamFeaturesViewProps {
  teamId: number;
}

const TeamFeaturesView = ({ teamId }: TeamFeaturesViewProps) => {
  const { t } = useLocale();

  return (
    <SettingsHeader
      title={t("feature_opt_in")}
      description={t("feature_opt_in_team_description")}
      borderInShellHeader={true}>
      <TeamOrgFeaturesSettings entityId={teamId} entityType="team" />
    </SettingsHeader>
  );
};

export default TeamFeaturesView;
