import { Button, Chip, toast } from '@heroui/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ScanFinding } from '../../shared/scan-event.ts'
import { postIgnoreRule } from '../actions/api/ignore-rule.ts'
import { FixFindingButton } from '../actions/fix/fix-finding-button.tsx'
import { severityColor } from '../dashboard/rows.ts'
import { fixText } from './detail.ts'
import { FindingMessage } from './finding-message.tsx'
import { refreshProject } from './refresh-project.ts'

/** The finding the file fixes settle on GitHub, by copying the description of the package.json, so it has a fix button without any file to rewrite */
const descriptionRule = 'missing-description'

/** What `FindingItem` shows and does */
interface FindingItemProps {
  /** The finding */
  finding: ScanFinding
  /** The repo name of the project the finding belongs to */
  projectName: string
}

/**
 * One finding: its rule id colored by severity, its message and, when it has a fix, the files the fix would change. Hovering it shows a button that fixes it when it has a fix, and one that ignores its rule on this project for 24 hours
 * @param props the props
 * @returns the list item
 */
export function FindingItem({ finding, projectName }: Readonly<FindingItemProps>) {
  const client = useQueryClient()
  const fix = fixText(finding)
  const ignore = useMutation({
    mutationFn: () => postIgnoreRule(projectName, finding.ruleId),
    onError: error => toast.danger(error.message),
    onSuccess: () => {
      toast.success(`Ignoring ${finding.ruleId} on ${projectName} for 24 hours`)
      return refreshProject(client, projectName)
    },
  })
  return (
    <li className="group hover:bg-default/30 -mx-2 flex flex-col gap-1 rounded-lg px-2 py-1 transition-colors" data-testid={`finding-${finding.ruleId}`}>
      <span className="flex items-center gap-2">
        <Chip color={severityColor[finding.severity]} size="sm">
          {finding.ruleId}
        </Chip>
        <FindingMessage finding={finding} />
        <span className="ml-auto flex items-center gap-2">
          {(finding.fixFiles.length > 0 || finding.ruleId === descriptionRule) && <FixFindingButton projectName={projectName} ruleId={finding.ruleId} />}
          <Button className="bg-background opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100" data-testid={`ignore-${finding.ruleId}`} isDisabled={ignore.isPending} onPress={() => ignore.mutate()} size="sm" variant="outline">
            Ignore for 24h
          </Button>
        </span>
      </span>
      {fix !== undefined && <span className="text-muted text-sm">{fix}</span>}
    </li>
  )
}
