const { test } = require('@ianwalter/bff')
const Router = require('.')

test('a route', ({ expect, fail }) => {
  const router = new Router('http://example.com')
  const context = { name: 'Free Spirit', url: '/my-bad' }
  router.add('/', fail)
  router.add('/my-bad', ctx => {
    expect(ctx.name).toBe(context.name)
    expect(ctx.url).toBe(context.url)
  })
  router.add('/my-bad/:id', fail)
  router.match(context)
})

test('a route twice', ({ expect, fail }) => {
  const router = new Router('http://example.com')
  const context = { url: '/my-bad' }
  let count = 0
  router.add('/my-bad', ctx => {
    count++
    if (count > 1) {
      expect(ctx.url).toBe(context.url)
    }
  })
  router.match(context)
  router.match(context)
})

test('a route with a route parameter', ({ expect, fail }) => {
  const router = new Router('http://example.com')
  const context = { url: '/my-bad/1' }
  router.add('/my-bad', fail)
  router.add('/my-bad/:id', ctx => {
    expect(ctx.params.id).toBe('1')
  })
  router.match(context)
})

test('a route with an async middleware', async ({ expect }) => {
  const router = new Router('http://example.com')
  const context = { url: '/my-bad' }
  router.add('/my-bad', ctx => new Promise(resolve => setTimeout(
    () => resolve(ctx),
    200
  )))
  const ctx = await router.match(context)
  expect(ctx.url).toBe(context.url)
})

test('no matching route', ({ pass, fail }) => {
  const router = new Router('http://example.com')
  const context = { url: '/my-ba' }
  router.add('/my-bad', fail)
  router.match(context)
  router.match(context, pass)
})

test('a route with multiple middleware', ({ expect }) => {
  const router = new Router('http://example.com')
  const context = { url: '/' }
  const first = (ctx, next) => (ctx.entered = true) && next()
  const second = ctx => expect(ctx.entered).toBe(true)
  router.add('/', first, second)
  router.match(context)
})

test('an invalid URL', ({ pass, fail }) => {
  const router = new Router('http://example.com')
  const context = { url: '//:-0' }
  router.add('/my-bad', fail)
  router.match(context, pass)
})
