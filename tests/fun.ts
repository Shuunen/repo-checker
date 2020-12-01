import test from 'ava'

const function_ = (): string => 'foo'

test('fn() returns foo', t => {
  t.is(function_(), 'foo')
})
