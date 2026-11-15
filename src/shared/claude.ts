/**
 * What the chat with Claude shows, a JSON-safe shape the server streams and the page renders: the messages of the user, what Claude says, the tools it runs, the end of a turn and the end of the session.
 * @module
 */

/** One line of the conversation */
export type ChatEvent =
  /** A turn of Claude is over, it waits for the next message */
  | { isError: boolean; type: 'done' }
  /** The session is over: the user closed it, or Claude stopped, or it could not start. Always the last event */
  | { message: string; type: 'exit' }
  /** What Claude says, markdown */
  | { text: string; type: 'text' }
  /** A tool Claude runs, with the command, the file or the pattern it is run on */
  | { detail: string; name: string; type: 'tool' }
  /** A message of the user */
  | { text: string; type: 'user' }
