export default {
  extensions: ['ts'],
  // nodeArguments: ['--experimental-modules'],
  require: ['ts-node/register'],
  files: ['tests/*.ts'], // specify a single file to work on it exclusively
}
