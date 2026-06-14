from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class ScenarioIds:
    """Data-driven id convention shared across the pipeline.

    Every demo id follows one pattern keyed by a scenario slug and a sequence:

        conjunction_id   = conj-<slug>-<seq>
        plan_id          = maneuver-plan-<slug>-<seq>
        candidate prefix = mnv-<slug>
        report_id        = report-<slug>-<seq>

    This collapses the previously-scattered literal id maps into one helper while
    reproducing exactly the ids the demo scenarios already use (so Protect ISRO,
    2009 Replay and Kessler stay byte-for-byte deterministic). Dynamically screened
    conjunctions (no trailing -NNN sequence) keep their whole body as the slug.
    """

    slug: str
    seq: str

    @classmethod
    def from_conjunction_id(cls, conjunction_id: str) -> "ScenarioIds":
        body = conjunction_id.removeprefix("conj-")
        head, _, tail = body.rpartition("-")
        if head and tail.isdigit():
            return cls(slug=head, seq=tail)
        return cls(slug=body, seq="")

    @classmethod
    def from_plan_id(cls, plan_id: str) -> "ScenarioIds":
        return cls.from_conjunction_id("conj-" + plan_id.removeprefix("maneuver-plan-"))

    @classmethod
    def from_report_id(cls, report_id: str) -> "ScenarioIds":
        return cls.from_conjunction_id("conj-" + report_id.removeprefix("report-"))

    @property
    def conjunction_id(self) -> str:
        return f"conj-{self.slug}-{self.seq}" if self.seq else f"conj-{self.slug}"

    @property
    def plan_id(self) -> str:
        return f"maneuver-plan-{self.slug}-{self.seq}" if self.seq else f"maneuver-plan-{self.slug}"

    @property
    def candidate_prefix(self) -> str:
        return f"mnv-{self.slug}"

    @property
    def report_id(self) -> str:
        return f"report-{self.slug}-{self.seq}" if self.seq else f"report-{self.slug}"
