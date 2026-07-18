"use client";

import { type FormEvent, useState } from "react";
import { toast } from "sonner";
import {
  Building2,
  Code2,
  Database,
  Globe2,
  Info,
  LockKeyhole,
  Mail,
  Phone,
  Server,
} from "lucide-react";

import {
  updateSystemInformationSettings,
  updateSystemUpgradeSettings,
} from "@/actions/settings.actions";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type SystemInformationData = {
  isAdmin: boolean;

  version: string;
  buildNumber: string;
  environment: string;
  nextVersion: string;
  nodeVersion: string;
  databaseProvider: string;
  databaseRegion: string;
  deploymentId: string;
  lastDeploymentAt: string;
  lastUpdatedAt: string;

  siteName: string;
  applicationName: string;
  companyName: string;
  ownerName: string;
  developerName: string;
  developerWebsite: string;
  supportEmail: string;
  supportPhone: string;
  websiteUrl: string;
  copyrightText: string;
  releaseNotes: string;
  systemStatus: string;
  maintenanceMessage: string;
  internalNotes: string;

  rollbackRetentionMonths: string;
  lastUpgradeAt: string;
  lastUpgradeBy: string;
  lastUpgradeNote: string;
};

function getActionError(result: unknown) {
  if (
    result &&
    typeof result === "object" &&
    "error" in result &&
    typeof result.error === "string"
  ) {
    return result.error;
  }

  return null;
}

function ReadOnlyItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </p>

      <div className="mt-1 flex items-center justify-between gap-2">
        <p className="wrap-break-word text-sm font-medium">
          {value || "Not available"}
        </p>

        <Badge variant="outline" className="shrink-0 text-[10px]">
          System
        </Badge>
      </div>
    </div>
  );
}

export function SystemInformation({
  data,
}: {
  data: SystemInformationData;
}) {
  const [siteName, setSiteName] = useState(data.siteName);
  const [applicationName, setApplicationName] = useState(
    data.applicationName
  );
  const [companyName, setCompanyName] = useState(data.companyName);
  const [ownerName, setOwnerName] = useState(data.ownerName);
  const [developerName, setDeveloperName] = useState(
    data.developerName
  );
  const [developerWebsite, setDeveloperWebsite] = useState(
    data.developerWebsite
  );
  const [supportEmail, setSupportEmail] = useState(data.supportEmail);
  const [supportPhone, setSupportPhone] = useState(data.supportPhone);
  const [websiteUrl, setWebsiteUrl] = useState(data.websiteUrl);
  const [copyrightText, setCopyrightText] = useState(
    data.copyrightText
  );
  const [releaseNotes, setReleaseNotes] = useState(
    data.releaseNotes
  );
  const [systemStatus, setSystemStatus] = useState(
    data.systemStatus
  );
  const [maintenanceMessage, setMaintenanceMessage] = useState(
    data.maintenanceMessage
  );
  const [internalNotes, setInternalNotes] = useState(
    data.internalNotes
  );

  const [targetVersion, setTargetVersion] = useState(
    data.nextVersion
  );
  const [retentionMonths, setRetentionMonths] = useState(
    data.rollbackRetentionMonths
  );
  const [upgradeNote, setUpgradeNote] = useState("");

  const [busy, setBusy] = useState(false);

  async function saveInformation(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!data.isAdmin || busy) return;

    setBusy(true);

    try {
      const result = await updateSystemInformationSettings({
        siteName,
        applicationName,
        companyName,
        ownerName,
        developerName,
        developerWebsite,
        supportEmail,
        supportPhone,
        websiteUrl,
        copyrightText,
        releaseNotes,
        systemStatus,
        maintenanceMessage,
        internalNotes,
      });

      const error = getActionError(result);

      if (error) {
        toast.error(error);
        return;
      }

      toast.success("System information saved");
    } catch (error) {
      console.error(error);
      toast.error("System information could not be saved");
    } finally {
      setBusy(false);
    }
  }

  async function saveUpgrade(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!data.isAdmin || busy) return;

    setBusy(true);

    try {
      const result = await updateSystemUpgradeSettings({
        targetVersion,
        retentionMonths,
        note: upgradeNote,
      });

      const error = getActionError(result);

      if (error) {
        toast.error(error);
        return;
      }

      setUpgradeNote("");
      toast.success("Upgrade record saved");
    } catch (error) {
      console.error(error);
      toast.error("Upgrade record could not be saved");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">
                System information
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Application, ownership and release information.
              </p>
            </div>

            <Badge
              variant={
                data.systemStatus === "ACTIVE"
                  ? "default"
                  : "secondary"
              }
            >
              {data.systemStatus || "ACTIVE"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ReadOnlyItem
            label="Current version"
            value={data.version}
            icon={<Info className="h-3.5 w-3.5" />}
          />

          <ReadOnlyItem
            label="Build number"
            value={data.buildNumber}
            icon={<Code2 className="h-3.5 w-3.5" />}
          />

          <ReadOnlyItem
            label="Environment"
            value={data.environment}
            icon={<Server className="h-3.5 w-3.5" />}
          />

          <ReadOnlyItem
            label="Last updated"
            value={data.lastUpdatedAt}
          />
        </CardContent>
      </Card>

      <form onSubmit={saveInformation} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Public information
            </CardTitle>
          </CardHeader>

          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Site name</Label>
              <Input
                value={siteName}
                onChange={(event) => setSiteName(event.target.value)}
                disabled={!data.isAdmin || busy}
              />
            </div>

            <div className="space-y-2">
              <Label>Application name</Label>
              <Input
                value={applicationName}
                onChange={(event) =>
                  setApplicationName(event.target.value)
                }
                disabled={!data.isAdmin || busy}
              />
            </div>

            <div className="space-y-2">
              <Label>Company name</Label>
              <Input
                value={companyName}
                onChange={(event) =>
                  setCompanyName(event.target.value)
                }
                disabled={!data.isAdmin || busy}
              />
            </div>

            <div className="space-y-2">
              <Label>Developer name</Label>
              <Input
                value={developerName}
                onChange={(event) =>
                  setDeveloperName(event.target.value)
                }
                disabled={!data.isAdmin || busy}
              />
            </div>

            <div className="space-y-2">
              <Label>Developer website</Label>
              <Input
                value={developerWebsite}
                onChange={(event) =>
                  setDeveloperWebsite(event.target.value)
                }
                disabled={!data.isAdmin || busy}
              />
            </div>

            <div className="space-y-2">
              <Label>Support email</Label>
              <Input
                type="email"
                value={supportEmail}
                onChange={(event) =>
                  setSupportEmail(event.target.value)
                }
                disabled={!data.isAdmin || busy}
              />
            </div>

            <div className="space-y-2">
              <Label>Website URL</Label>
              <Input
                value={websiteUrl}
                onChange={(event) =>
                  setWebsiteUrl(event.target.value)
                }
                disabled={!data.isAdmin || busy}
              />
            </div>

            <div className="space-y-2">
              <Label>System status</Label>
              <Input
                value={systemStatus}
                onChange={(event) =>
                  setSystemStatus(event.target.value)
                }
                disabled={!data.isAdmin || busy}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Copyright</Label>
              <Input
                value={copyrightText}
                onChange={(event) =>
                  setCopyrightText(event.target.value)
                }
                disabled={!data.isAdmin || busy}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Release notes</Label>
              <textarea
                value={releaseNotes}
                onChange={(event) =>
                  setReleaseNotes(event.target.value)
                }
                rows={5}
                disabled={!data.isAdmin || busy}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>
          </CardContent>
        </Card>

        {data.isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <LockKeyhole className="h-4 w-4" />
                Admin-only information
              </CardTitle>
            </CardHeader>

            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Owner name</Label>
                <Input
                  value={ownerName}
                  onChange={(event) =>
                    setOwnerName(event.target.value)
                  }
                  disabled={busy}
                />
              </div>

              <div className="space-y-2">
                <Label>Support phone</Label>
                <Input
                  value={supportPhone}
                  onChange={(event) =>
                    setSupportPhone(event.target.value)
                  }
                  disabled={busy}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Maintenance message</Label>
                <textarea
                  value={maintenanceMessage}
                  onChange={(event) =>
                    setMaintenanceMessage(event.target.value)
                  }
                  rows={3}
                  disabled={busy}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Internal notes</Label>
                <textarea
                  value={internalNotes}
                  onChange={(event) =>
                    setInternalNotes(event.target.value)
                  }
                  rows={4}
                  disabled={busy}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="md:col-span-2">
                <Button type="submit" disabled={busy}>
                  {busy ? "Saving..." : "Save system information"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </form>

      {data.isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Technical information
            </CardTitle>
          </CardHeader>

          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ReadOnlyItem
              label="Next.js"
              value={data.nextVersion}
              icon={<Code2 className="h-3.5 w-3.5" />}
            />

            <ReadOnlyItem
              label="Node.js"
              value={data.nodeVersion}
              icon={<Server className="h-3.5 w-3.5" />}
            />

            <ReadOnlyItem
              label="Database"
              value={data.databaseProvider}
              icon={<Database className="h-3.5 w-3.5" />}
            />

            <ReadOnlyItem
              label="Database region"
              value={data.databaseRegion}
              icon={<Globe2 className="h-3.5 w-3.5" />}
            />

            <ReadOnlyItem
              label="Deployment ID"
              value={data.deploymentId}
            />

            <ReadOnlyItem
              label="Last deployment"
              value={data.lastDeploymentAt}
            />
          </CardContent>
        </Card>
      )}

      {data.isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Record system upgrade
            </CardTitle>

            <p className="text-xs text-muted-foreground">
              Current application version is {data.version}. Enter the
              new version when deploying an upgrade.
            </p>
          </CardHeader>

          <CardContent>
            <form
              onSubmit={saveUpgrade}
              className="grid gap-4 md:grid-cols-3"
            >
              <div className="space-y-2">
                <Label>New version</Label>
                <Input
                  value={targetVersion}
                  onChange={(event) =>
                    setTargetVersion(event.target.value)
                  }
                  placeholder="0.2.0"
                  disabled={busy}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Rollback retention</Label>
                <select
                  value={retentionMonths}
                  onChange={(event) =>
                    setRetentionMonths(event.target.value)
                  }
                  disabled={busy}
                  className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                >
                  <option value="1">1 month</option>
                  <option value="2">2 months</option>
                </select>
              </div>

              <div className="space-y-2 md:col-span-3">
                <Label>Upgrade note</Label>
                <textarea
                  value={upgradeNote}
                  onChange={(event) =>
                    setUpgradeNote(event.target.value)
                  }
                  rows={4}
                  disabled={busy}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="md:col-span-3">
                <Button type="submit" disabled={busy}>
                  {busy ? "Saving..." : "Save upgrade record"}
                </Button>
              </div>
            </form>

            {data.lastUpgradeAt && (
              <div className="mt-4 rounded-md border bg-muted/20 p-3 text-xs text-muted-foreground">
                Last upgrade: {data.lastUpgradeAt}
                {data.lastUpgradeBy
                  ? ` · ${data.lastUpgradeBy}`
                  : ""}
                {data.lastUpgradeNote
                  ? ` · ${data.lastUpgradeNote}`
                  : ""}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}