export default class Router {
  constructor (base) {
    this.routes = []
    this.base = base
  }

  add (path, callback) {
    const parts = path.split('/').filter(part => part)
    const route = { path, parts, params: {}, callback }
    for (const part of parts) {
      if (part.indexOf(':') === 0) {
        route.params[part.substring(1)] = undefined
      }
    }
    this.routes.push(route)
  }

  match (ctx, callback) {
    const url = new URL(ctx.request.url, this.base)
    const parts = url.pathname.split('/').filter(part => part)

    const route = this.routes.find(route => {
      if (parts.length === route.parts.length) {
        for (const [index, part] of route.parts.entries()) {
          const paramIndex = part.indexOf(':')
          if (parts[index] !== part && paramIndex !== 0) {
            return false
          } else if (paramIndex === 0) {
            route.params[part.substring(1)] = parts[index]
          }
        }
        return true
      }
      return false
    })

    if (route) {
      route.callback(ctx, Object.assign(url, route))
    } else {
      callback(ctx, { url, parts })
    }
  }
}
