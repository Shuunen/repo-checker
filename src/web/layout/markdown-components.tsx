import { invariant } from 'es-toolkit'
import { Children, isValidElement, type ComponentProps, type ReactElement, type ReactNode } from 'react'
import type { Components } from 'react-markdown'

/**
 * The items of a list, without the line breaks between them
 * @param children what the list holds
 * @returns the items
 */
function itemsOf(children: ReactNode) {
  // oxlint-disable-next-line react/no-react-children -- react-markdown hands the items of a list as children, there is no other way to number them
  return Children.toArray(children).filter((child): child is ReactElement<{ children?: ReactNode }> => isValidElement(child))
}

/** The components that render the markdown of Claude, the ones of a list are in {@link listFor} */
/* oxlint-disable id-length -- the keys are the names of the HTML tags */
export const baseComponents: Components = {
  a: ({ children, href }) => (
    <a className="text-accent underline" href={href} rel="noreferrer" target="_blank">
      {children}
    </a>
  ),
  code: ({ children, className }) => <code className={className === undefined ? 'rounded bg-default px-1 font-mono text-xs' : 'font-mono text-xs'}>{children}</code>,
  h1: ({ children }) => <h3 className="mt-5 mb-2 text-base font-semibold">{children}</h3>,
  h2: ({ children }) => <h3 className="mt-5 mb-2 text-base font-semibold">{children}</h3>,
  h3: ({ children }) => <h3 className="mt-5 mb-2 text-base font-semibold">{children}</h3>,
  p: ({ children, node }) => {
    invariant(node !== undefined, 'react-markdown gives the node of every element')
    const isTitle = node.children.length === 1 && node.children.every(child => child.type === 'element' && child.tagName === 'strong')
    return <p className={isTitle ? 'mt-5 mb-2 text-base' : 'my-2'}>{children}</p>
  },
  pre: ({ children }) => <pre className="my-2 overflow-x-auto rounded bg-default p-2">{children}</pre>,
  ul: ({ children }) => <ul className="my-3 list-disc space-y-2 pl-6">{children}</ul>,
}
/* oxlint-enable id-length */

/**
 * The renderer of numbered lists: buttons that answer with their number when the answer is open, a plain list otherwise
 * @param onChoose called with the number of the clicked item, undefined when the message cannot be answered by a click
 * @returns the component of the `ol` tag
 */
export function listFor(onChoose: ((choice: string) => void) | undefined): NonNullable<Components['ol']> {
  return function NumberedList({ children, start }: ComponentProps<'ol'>) {
    const first = start ?? 1
    if (onChoose === undefined)
      return (
        <ol className="my-3 list-decimal space-y-2 pl-6" start={first}>
          {children}
        </ol>
      )
    return (
      <ol className="my-3 flex flex-col gap-2">
        {itemsOf(children).map((item, position) => {
          const choice = String(first + position)
          return (
            <li key={choice}>
              <button className="flex w-full cursor-pointer gap-2 rounded-md px-2 py-1.5 text-left hover:bg-accent/15" data-testid={`choice-${choice}`} onClick={() => onChoose(choice)} type="button">
                <span>{`${choice}.`}</span>
                <span>{item.props.children}</span>
              </button>
            </li>
          )
        })}
      </ol>
    )
  }
}
