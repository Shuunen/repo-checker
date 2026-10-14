import { useEffect, useRef, useState } from 'react'
import type { ActionKind } from '../../shared/action.ts'

/**
 * The action picked in an Actions menu, and the hidden holder of its button: once the action is picked its button is mounted and pressed, so its confirmation opens and survives the menu closing. Picking the same action again presses the button that is already there
 * @returns the ref of the holder, the picked action and the handler of the menu
 * @example const { chosen, handleAction, holder } = useChosenAction()
 */
export function useChosenAction() {
  const holder = useRef<HTMLSpanElement>(null)
  const [chosen, setChosen] = useState<ActionKind | 'delete-project' | undefined>()
  const press = () => holder.current?.querySelector<HTMLElement>('button')?.click()
  useEffect(() => {
    if (chosen !== undefined) holder.current?.querySelector<HTMLElement>('button')?.click()
  }, [chosen])
  const handleAction = (key: unknown) => {
    if (key === chosen) press()
    else setChosen(key as ActionKind | 'delete-project')
  }
  return { chosen, handleAction, holder }
}
