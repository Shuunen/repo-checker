import { QueryClient } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app.tsx'
// oxlint-disable-next-line import/no-unassigned-import -- a stylesheet is imported for its effect, it has no name
import './styles.css'
import { followSystemTheme } from './theme.ts'

followSystemTheme(document.documentElement, matchMedia('(prefers-color-scheme: dark)'))
const root = document.querySelector('#root')
if (root === null) throw new Error('the page has no #root element')
createRoot(root).render(
  <StrictMode>
    <App client={new QueryClient()} />
  </StrictMode>,
)
