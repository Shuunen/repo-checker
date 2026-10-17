/**
 * What a scan gives, in a JSON-safe shape: the server streams it as events, one per project as soon as it is checked, so the page fills in live.
 * @module
 */
import type { ActionKind } from './action.ts'
import type { Project } from './project.ts'

/** How bad a finding is, one scale for every check: error means something is wrong or work could be lost, warning should be fixed, info is a suggestion */
export type Severity = 'error' | 'info' | 'warning'

/** Where a finding comes from: a file rule reads the project files, a project rule compares the clone with GitHub (the Sync checks) */
export type FindingScope = 'file' | 'project'

/** What happened to one rule on one project */
export interface RuleOutcome {
  /** The rule id */
  ruleId: string
  /** `failed` when it reported at least one finding, `passed` when it reported none, `skipped` when its `appliesTo` returned false */
  status: 'failed' | 'passed' | 'skipped'
}

/** A finding as the page receives it: the edits of its fix stay on the server, only the files they change are sent */
export interface ScanFinding {
  /** The actions offered by a project rule, empty for a file rule */
  actions: ActionKind[]
  /** The files the fix would change, empty when the finding has no fix */
  fixFiles: string[]
  /** The final message, placeholders filled */
  message: string
  /** The message id the rule reported */
  messageId: string
  /** The id of the rule that reported it */
  ruleId: string
  /** Whether a file rule or a project rule reported it */
  scope: FindingScope
  /** The severity of the rule that reported it */
  severity: Severity
}

/** The result of one project */
export interface ScanProject {
  /** The findings, project rules first */
  findings: ScanFinding[]
  /** One outcome per rule that could run on the project */
  outcomes: RuleOutcome[]
  /** The project */
  project: Project
}

/** One event of the scan stream, its `type` is also the server-sent event name */
export type ScanEvent =
  /** The scan is over */
  | { durationMs: number; isSingle: boolean; owner: string; type: 'done' }
  /** The scan stopped, for example because gh is not logged in */
  | { message: string; type: 'failed' }
  /** A short line about what the scan is doing */
  | { line: string; type: 'progress' }
  /** One project is checked */
  | { result: ScanProject; type: 'project' }
  /** The scan begins, always the first event */
  | { target: string; type: 'started' }

/** What scanning one project again gives: the project as it is now, undefined when it is gone (a deleted fork, a deleted folder of a repo that does not exist), or the reason it could not be scanned */
export type RescanResult = { ok: true; project: ScanProject | undefined; target: string } | { ok: false; reason: string }
