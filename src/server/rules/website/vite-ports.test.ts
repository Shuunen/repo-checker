import { testProjectRule } from '../../test/rule-tester.ts'
import { viteUniquePorts } from './vite-ports.rule.ts'

testProjectRule(viteUniquePorts, {
  invalid: [
    {
      errors: ['clash'],
      local: { vitePorts: { preview: 4105, server: 5105 } },
      name: 'the same number as another project',
      siblings: [
        { name: 'other', vitePorts: { server: 5105 } },
        { name: 'app', vitePorts: { server: 5105 } },
      ],
    },
    {
      errors: ['clash'],
      local: { vitePorts: { preview: 4105 } },
      name: 'a preview number shared with a dev number',
      siblings: [
        { name: 'other', vitePorts: { server: 5105 } },
        { name: 'third', vitePorts: { preview: 4105 } },
      ],
    },
  ],
  valid: [
    { local: { vitePorts: { preview: 4105, server: 5105 } }, name: 'its own number', siblings: [{ name: 'other', vitePorts: { server: 5106 } }] },
    { local: { vitePorts: { server: 8085 } }, name: 'a port out of the scheme', siblings: [{ name: 'other', vitePorts: { server: 8085 } }] },
    { local: {}, name: 'no ports', siblings: [{ name: 'other', vitePorts: { server: 5105 } }, { name: 'none' }] },
    { name: 'not cloned', siblings: [{ name: 'other', vitePorts: { server: 5105 } }] },
    { local: { vitePorts: { server: 5105 } }, name: 'checked alone' },
  ],
})
