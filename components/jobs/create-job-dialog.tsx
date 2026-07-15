"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createJob } from "@/actions/job.actions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  CalendarClock,
  Clock,
  Target,
  type LucideIcon,
} from "lucide-react";

type Option = {
  id: string;
  name: string;
};

type SelectedMember = {
  userId: string;
  workerValue: string;
};

type JobType = "MONTHLY" | "FIXED" | "HOURLY";

type ClientMode = "INTERNAL" | "EXTERNAL";

type Currency = "USD" | "EUR" | "GBP" | "BDT";

type JobTypeOption = {
  value: JobType;
  label: string;
  hint: string;
  icon: LucideIcon;
};

type CreateJobDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Option[];
  teamMembers: Option[];
  skills: Option[];
};

const JOB_TYPES: JobTypeOption[] = [
  {
    value: "MONTHLY",
    label: "Monthly",
    hint: "Subscription + weekly roadmap",
    icon: CalendarClock,
  },
  {
    value: "FIXED",
    label: "Fixed price",
    hint: "Milestones + deadline",
    icon: Target,
  },
  {
    value: "HOURLY",
    label: "Hourly",
    hint: "Timer + weekly limit",
    icon: Clock,
  },
];

export function CreateJobDialog({
  open,
  onOpenChange,
  clients,
  teamMembers,
  skills,
}: CreateJobDialogProps) {
  const router = useRouter();

  // Basic information
  const [type, setType] = useState<JobType>("MONTHLY");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // Client
  const [clientMode, setClientMode] =
    useState<ClientMode>("INTERNAL");
  const [clientId, setClientId] = useState("");
  const [externalSource, setExternalSource] = useState("Fiverr");
  const [externalName, setExternalName] = useState("");
  const [externalCountry, setExternalCountry] = useState("");

  // Pricing
  const [clientValue, setClientValue] = useState("");
  const [clientCurrency, setClientCurrency] =
    useState<Currency>("USD");

  // Type-specific fields
  const [startDate, setStartDate] = useState("");
  const [billingDay, setBillingDay] = useState("1");
  const [deadline, setDeadline] = useState("");
  const [weeklyHourLimit, setWeeklyHourLimit] = useState("");

  // Skills and members
  const [skillIds, setSkillIds] = useState<string[]>([]);
  const [members, setMembers] = useState<SelectedMember[]>([]);

  // Form state
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function toggleSkill(skillId: string) {
    setSkillIds((currentSkills) =>
      currentSkills.includes(skillId)
        ? currentSkills.filter((id) => id !== skillId)
        : [...currentSkills, skillId]
    );
  }

  function toggleMember(userId: string) {
    setMembers((currentMembers) => {
      const isSelected = currentMembers.some(
        (member) => member.userId === userId
      );

      if (isSelected) {
        return currentMembers.filter(
          (member) => member.userId !== userId
        );
      }

      return [
        ...currentMembers,
        {
          userId,
          workerValue: "",
        },
      ];
    });
  }

  function setWorkerValue(userId: string, value: string) {
    setMembers((currentMembers) =>
      currentMembers.map((member) =>
        member.userId === userId
          ? {
              ...member,
              workerValue: value,
            }
          : member
      )
    );
  }

  function handleClientModeChange(mode: ClientMode) {
    setClientMode(mode);
    setError("");

    if (mode === "INTERNAL") {
      setExternalName("");
      setExternalCountry("");
      setExternalSource("Fiverr");
    } else {
      setClientId("");
    }
  }

  function handleJobTypeChange(jobType: JobType) {
    setType(jobType);
    setError("");

    if (jobType !== "MONTHLY") {
      setBillingDay("1");
    }

    if (jobType !== "FIXED") {
      setDeadline("");
    }

    if (jobType !== "HOURLY") {
      setWeeklyHourLimit("");
    }
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (loading) return;

    setError("");

    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    const cleanExternalName = externalName.trim();
    const cleanExternalCountry = externalCountry.trim();

    if (cleanTitle.length < 3) {
      setError("Job title must contain at least 3 characters.");
      return;
    }

    if (clientMode === "INTERNAL" && !clientId) {
      setError("Please select an internal client.");
      return;
    }

    if (clientMode === "EXTERNAL" && !cleanExternalName) {
      setError("Please enter the external client name.");
      return;
    }

    if (type === "MONTHLY" && !startDate) {
      setError("Please select the monthly job start date.");
      return;
    }

    const invalidMemberValue = members.some((member) => {
      const value = Number(member.workerValue);

      return (
        !member.workerValue ||
        !Number.isFinite(value) ||
        value < 0
      );
    });

    if (invalidMemberValue) {
      setError(
        "Please enter a valid worker value for each selected member."
      );
      return;
    }

    setLoading(true);

    try {
      const result = await createJob({
        title: cleanTitle,
        description: cleanDescription,
        type,
        clientMode,
        clientId:
          clientMode === "INTERNAL" && clientId
            ? clientId
            : undefined,
        externalSource:
          clientMode === "EXTERNAL"
            ? externalSource
            : undefined,
        externalName:
          clientMode === "EXTERNAL"
            ? cleanExternalName
            : "",
        externalCountry:
          clientMode === "EXTERNAL"
            ? cleanExternalCountry
            : "",
        clientValue,
        clientCurrency,
        startDate,
        billingDay,
        deadline,
        weeklyHourLimit,
        skillIds,
        members,
      });

      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }

      onOpenChange(false);

      if ("jobId" in result && result.jobId) {
        router.push(`/jobs/${result.jobId}`);
        router.refresh();
      }
    } catch (submitError) {
      console.error("Failed to create job:", submitError);

      setError(
        "Something went wrong while creating the job. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  const valueLabel =
    type === "MONTHLY"
      ? "per month"
      : type === "HOURLY"
        ? "per hour"
        : "total budget";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create new job</DialogTitle>

          <DialogDescription>
            Select the job type — fields adjust automatically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Job type */}
          <div className="grid grid-cols-3 gap-2">
            {JOB_TYPES.map((jobType) => {
              const Icon = jobType.icon;
              const isSelected = type === jobType.value;

              return (
                <button
                  key={jobType.value}
                  type="button"
                  onClick={() =>
                    handleJobTypeChange(jobType.value)
                  }
                  disabled={loading}
                  className={`rounded-lg border-2 p-3 text-center transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/40"
                  }`}
                >
                  <Icon
                    className={`mx-auto h-5 w-5 ${
                      isSelected
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`}
                  />

                  <p className="mt-1 text-sm font-medium">
                    {jobType.label}
                  </p>

                  <p className="text-[10px] text-muted-foreground">
                    {jobType.hint}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Job title */}
          <div className="space-y-2">
            <Label htmlFor="job-title">Job title</Label>

            <Input
              id="job-title"
              name="title"
              value={title}
              onChange={(event) =>
                setTitle(event.target.value)
              }
              placeholder="e.g. Website care plan — August"
              minLength={3}
              maxLength={150}
              disabled={loading}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="job-description">
              Description{" "}
              <span className="text-xs font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>

            <Textarea
              id="job-description"
              name="description"
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              rows={3}
              maxLength={5000}
              disabled={loading}
              placeholder="Add job details, goals and other information..."
            />
          </div>

          {/* Client */}
          <div className="space-y-2">
            <Label>Client</Label>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  handleClientModeChange("INTERNAL")
                }
                disabled={loading}
                className={`flex-1 rounded-md border px-3 py-1.5 text-sm transition-colors ${
                  clientMode === "INTERNAL"
                    ? "border-primary bg-primary/5 font-medium"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                Internal client
              </button>

              <button
                type="button"
                onClick={() =>
                  handleClientModeChange("EXTERNAL")
                }
                disabled={loading}
                className={`flex-1 rounded-md border px-3 py-1.5 text-sm transition-colors ${
                  clientMode === "EXTERNAL"
                    ? "border-primary bg-primary/5 font-medium"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                External client
              </button>
            </div>

            {clientMode === "INTERNAL" ? (
              <Select
                value={clientId}
                onValueChange={(value) => {
                  if (value !== null) {
                    setClientId(value);
                  }
                }}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a client..." />
                </SelectTrigger>

                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem
                      key={client.id}
                      value={client.id}
                    >
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="grid gap-2 sm:grid-cols-3">
                <Select
                  value={externalSource}
                  onValueChange={(value) => {
                    if (value !== null) {
                      setExternalSource(value);
                    }
                  }}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="Fiverr">
                      Fiverr
                    </SelectItem>
                    <SelectItem value="Upwork">
                      Upwork
                    </SelectItem>
                    <SelectItem value="Other">
                      Other
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  value={externalName}
                  onChange={(event) =>
                    setExternalName(event.target.value)
                  }
                  placeholder="Client name"
                  disabled={loading}
                  required
                />

                <Input
                  value={externalCountry}
                  onChange={(event) =>
                    setExternalCountry(event.target.value)
                  }
                  placeholder="Country"
                  disabled={loading}
                />
              </div>
            )}
          </div>

          {/* Type-specific settings */}
          <div className="space-y-3 rounded-lg bg-primary/5 p-3">
            <p className="text-xs font-semibold text-primary">
              {type.replace("_", " ")} SETTINGS
            </p>

            {type === "MONTHLY" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="monthly-start-date"
                    className="text-xs"
                  >
                    Start date
                  </Label>

                  <Input
                    id="monthly-start-date"
                    type="date"
                    value={startDate}
                    onChange={(event) =>
                      setStartDate(event.target.value)
                    }
                    disabled={loading}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="billing-day"
                    className="text-xs"
                  >
                    Billing day (1–28)
                  </Label>

                  <Input
                    id="billing-day"
                    type="number"
                    min={1}
                    max={28}
                    step={1}
                    value={billingDay}
                    onChange={(event) =>
                      setBillingDay(event.target.value)
                    }
                    disabled={loading}
                    required
                  />
                </div>
              </div>
            )}

            {type === "FIXED" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="fixed-start-date"
                    className="text-xs"
                  >
                    Start date{" "}
                    <span className="font-normal text-muted-foreground">
                      (optional)
                    </span>
                  </Label>

                  <Input
                    id="fixed-start-date"
                    type="date"
                    value={startDate}
                    onChange={(event) =>
                      setStartDate(event.target.value)
                    }
                    disabled={loading}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="deadline"
                    className="text-xs"
                  >
                    Deadline
                  </Label>

                  <Input
                    id="deadline"
                    type="date"
                    value={deadline}
                    onChange={(event) =>
                      setDeadline(event.target.value)
                    }
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            {type === "HOURLY" && (
              <div className="space-y-1.5">
                <Label
                  htmlFor="weekly-hour-limit"
                  className="text-xs"
                >
                  Weekly hour limit per member{" "}
                  <span className="font-normal text-muted-foreground">
                    (empty means unlimited)
                  </span>
                </Label>

                <Input
                  id="weekly-hour-limit"
                  type="number"
                  min={1}
                  max={168}
                  step={1}
                  value={weeklyHourLimit}
                  onChange={(event) =>
                    setWeeklyHourLimit(event.target.value)
                  }
                  placeholder="e.g. 20"
                  disabled={loading}
                />
              </div>
            )}
          </div>

          {/* Pricing */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="client-value">
                Client value{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  ({valueLabel})
                </span>
              </Label>

              <Input
                id="client-value"
                type="number"
                min={0}
                step="0.01"
                value={clientValue}
                onChange={(event) =>
                  setClientValue(event.target.value)
                }
                placeholder="300.00"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label>Currency</Label>

              <Select
                value={clientCurrency}
                onValueChange={(value) =>
                  setClientCurrency(value as Currency)
                }
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="USD">
                    USD ($)
                  </SelectItem>
                  <SelectItem value="EUR">
                    EUR (€)
                  </SelectItem>
                  <SelectItem value="GBP">
                    GBP (£)
                  </SelectItem>
                  <SelectItem value="BDT">
                    BDT (৳)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Required skills */}
          <div className="space-y-2">
            <Label>
              Required skills{" "}
              <span className="text-xs font-normal text-muted-foreground">
                (marketplace matching)
              </span>
            </Label>

            <div className="flex flex-wrap gap-1.5">
              {skills.map((skill) => {
                const isSelected = skillIds.includes(skill.id);

                return (
                  <button
                    key={skill.id}
                    type="button"
                    onClick={() => toggleSkill(skill.id)}
                    disabled={loading}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/10 font-medium text-primary"
                        : "text-muted-foreground hover:border-muted-foreground/40"
                    }`}
                  >
                    {skill.name}
                    {isSelected && " ✓"}
                  </button>
                );
              })}

              {skills.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No skills have been added yet.
                </p>
              )}
            </div>
          </div>

          {/* Members */}
          <div className="space-y-2">
            <Label>
              Assign to{" "}
              <span className="text-xs font-normal text-muted-foreground">
                (empty means open for applications)
              </span>
            </Label>

            <div className="flex flex-wrap gap-1.5">
              {teamMembers.map((teamMember) => {
                const isSelected = members.some(
                  (member) =>
                    member.userId === teamMember.id
                );

                return (
                  <button
                    key={teamMember.id}
                    type="button"
                    onClick={() =>
                      toggleMember(teamMember.id)
                    }
                    disabled={loading}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/10 font-medium text-primary"
                        : "text-muted-foreground hover:border-muted-foreground/40"
                    }`}
                  >
                    {teamMember.name}
                    {isSelected && " ✓"}
                  </button>
                );
              })}

              {teamMembers.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No team members yet.
                </p>
              )}
            </div>

            {/* Worker value */}
            {members.map((selectedMember) => {
              const teamMember = teamMembers.find(
                (member) =>
                  member.id === selectedMember.userId
              );

              return (
                <div
                  key={selectedMember.userId}
                  className="flex items-center gap-2"
                >
                  <span className="w-28 shrink-0 truncate text-xs">
                    {teamMember?.name ?? "Team member"}
                  </span>

                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={selectedMember.workerValue}
                    onChange={(event) =>
                      setWorkerValue(
                        selectedMember.userId,
                        event.target.value
                      )
                    }
                    placeholder={`Worker value ৳ (${valueLabel})`}
                    className="h-8 text-sm"
                    disabled={loading}
                    required
                  />
                </div>
              );
            })}
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600"
            >
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? "Creating job..." : "Create job"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}