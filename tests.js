const { test } = require('@ianwalter/bff')
const Router = require('.')

test('a route', ({ expect, fail }) => {
  const router = new Router('http://example.com')
  const context = { name: 'Free Spirit', request: { url: '/my-bad' } }
  return new Promise(resolve => {
    router.add('/my-bad', ctx => {
      expect(ctx.name).toBe(context.name)
      expect(ctx.request).toBe(context.request)
      resolve()
    })
    router.add('/my-bad/:id', fail)
    router.match(context)
  })
})

test('a route twice', ({ expect, fail }) => {
  const router = new Router('http://example.com')
  const context = { name: 'Free Spirit', request: { url: '/my-bad' } }
  let count = 0
  return new Promise(resolve => {
    router.add('/my-bad', ctx => {
      count++
      if (count > 1) {
        expect(ctx.request).toBe(context.request)
        resolve()
      }
    })
    router.add('/my-bad/:id', fail)
    router.match(context)
    router.match(context)
  })
})

test('a route with a route parameter', ({ expect, fail }) => {
  const router = new Router('http://example.com')
  const context = { name: 'Free Spirit', request: { url: '/my-bad/1' } }
  return new Promise(resolve => {
    router.add('/my-bad', fail)
    router.add('/my-bad/:id', ctx => {
      expect(ctx.name).toBe(context.name)
      expect(ctx.route.params.id).toBe('1')
      resolve()
    })
    router.match(context)
  })
})

test('a route with a search parameter', ({ expect }) => {
  const router = new Router('http://example.com')
  const context = { name: 'Free Spirit', request: { url: '/my-bad?id=1' } }
  return new Promise(resolve => {
    router.add('/my-bad', ctx => {
      expect(ctx.request).toBe(context.request)
      expect(ctx.url.searchParams.get('id')).toBe('1')
      resolve()
    })
    router.match(context)
  })
})

test('a route with an async callback', async ({ expect }) => {
  const router = new Router('http://example.com')
  const context = { name: 'Free Spirit', request: { url: '/my-bad' } }
  router.add('/my-bad', () => {
    return new Promise(resolve => setTimeout(
      () => {
        context.name = 'Old Town Road'
        resolve()
      },
      1000
    ))
  })
  await router.match(context)
  expect(context.name).toBe('Old Town Road')
})

test('no matching route', async ({ fail, pass }) => {
  const router = new Router('http://example.com')
  const context = { name: 'Free Spirit', request: { url: '/my-ba' } }
  router.add('/my-bad', () => fail())
  await router.match(context)
  pass()
})

test('no matching route with callback', async ({ expect, fail }) => {
  const router = new Router('http://example.com')
  const context = { name: 'Free Spirit', request: { url: '/my-ba' } }
  router.add('/my-bad', fail)
  await router.match(context, ctx => {
    expect(ctx.name).toBe(context.name)
    expect(ctx.url.href).toBe('http://example.com/my-ba')
  })
})
