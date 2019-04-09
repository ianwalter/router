const { test } = require('@ianwalter/bff')
const Router = require('.')

test('a route', ({ expect, fail }) => {
  const router = new Router('http://example.com')
  const context = { name: 'Free Spirit', request: { url: '/my-bad' } }
  return new Promise(resolve => {
    router.add('/my-bad', ctx => {
      expect(ctx).toBe(context)
      resolve()
    })
    router.add('/my-bad/:id', fail)
    router.match(context)
  })
})

test('a route with a route parameter', ({ expect, fail }) => {
  const router = new Router('http://example.com')
  const context = { name: 'Free Spirit', request: { url: '/my-bad/1' } }
  return new Promise(resolve => {
    router.add('/my-bad', fail)
    router.add('/my-bad/:id', (ctx, route) => {
      expect(ctx).toBe(context)
      expect(route.params.id).toBe('1')
      resolve()
    })
    router.match(context)
  })
})

test('a route with a search parameter', ({ expect }) => {
  const router = new Router('http://example.com')
  const context = { name: 'Free Spirit', request: { url: '/my-bad?id=1' } }
  return new Promise(resolve => {
    router.add('/my-bad', (ctx, route) => {
      expect(ctx).toBe(context)
      expect(route.searchParams.get('id')).toBe('1')
      resolve()
    })
    router.match(context)
  })
})
