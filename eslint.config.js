import antfu from '@antfu/eslint-config'

export default antfu({
  ignores: ['.github', '**/.github/**', 'dist', '**/dist/**', 'public', '**/public/**'],
  vue: false,
})
