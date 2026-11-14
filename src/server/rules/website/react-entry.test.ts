import { testRule } from '../../test/rule-tester.ts'
import { reactStrictMode } from './react-entry.rule.ts'

const pkg = { dependencies: { react: '20.0.0' } }

testRule(reactStrictMode, {
  invalid: [{ errors: ['missing'], files: { 'src/main.tsx': 'createRoot(root).render(<App />)\n' }, name: 'no strict mode', pkg }],
  valid: [
    { files: { 'src/main.tsx': 'createRoot(root).render(<StrictMode><App /></StrictMode>)\n' }, name: 'strict mode', pkg },
    { files: { 'src/main.tsx': 'createRoot(root).render(<App />)\n' }, name: 'no react' },
    { files: { 'src/app.tsx': 'export const App = () => null\n' }, name: 'no entry', pkg },
  ],
})
