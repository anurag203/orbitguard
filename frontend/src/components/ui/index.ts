/**
 * OrbitGuard UI kit barrel (doc 05 §1.1). Routes import `from "@/components/ui"`.
 * Presentational components only — no data fetching lives here.
 */

export { cn } from "./cn";
export { focusRing, textStyles } from "./styles";
export { Slot } from "./Slot";

// Mode (Simple | Pro)
export { ModeProvider, useMode, type Mode } from "./ModeProvider";

// Primitives
export { Button, buttonVariants, type ButtonProps, type ButtonSize, type ButtonVariant } from "./Button";
export { IconButton, type IconButtonProps } from "./IconButton";
export { Card, Surface, type Elevation, type SurfaceProps } from "./Surface";
export { PageHeader, type PageHeaderProps } from "./PageHeader";
export { Section, type SectionProps } from "./Section";
export { Row, Stack, type RowProps, type Space, type StackProps } from "./layout";

// Data display
export { Stat, type StatProps } from "./Stat";
export { CountUp, type CountUpProps } from "./CountUp";
export { Badge, Pill, type BadgeProps, type BadgeTone, type PillProps } from "./Badge";
export { RiskBadge, type RiskBadgeProps } from "./RiskBadge";
export { RiskMeter, type RiskMeterProps } from "./RiskMeter";
export { DataRow, KeyValue, type DataRowProps, type KeyValueProps } from "./DataRow";

// Explanation & jargon
export { Tooltip, TooltipProvider, type TooltipProps } from "./Tooltip";
export { Term, type TermProps } from "./Term";
export { InfoDot, type InfoDotProps } from "./InfoDot";

// Disclosure & navigation
export { Disclosure, ShowDetails, type DisclosureProps } from "./Disclosure";
export { Tabs, TabsPanel, type TabItem, type TabsProps } from "./Tabs";
export { ScenarioTabs, type ScenarioId, type ScenarioTabsProps } from "./ScenarioTabs";
export { ModeToggle, Switch, type ModeToggleProps, type SwitchProps } from "./Switch";
export { Dialog, type DialogProps } from "./Dialog";
export { Sheet, type SheetProps } from "./Sheet";

// Status & feedback
export { LoadingState, Skeleton, type LoadingStateProps, type SkeletonProps } from "./Skeleton";
export { EmptyState, type EmptyStateProps } from "./EmptyState";
export { ErrorState, type ErrorStateProps } from "./ErrorState";
export { LiveChip, type LiveChipProps } from "./LiveChip";
export { Steps, type Step, type StepStatus, type StepsProps } from "./Steps";
